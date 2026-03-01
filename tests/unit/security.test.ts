import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { detectSuspiciousActivity, isTransientError, retryAsync, IRetryOptions } from '../../src/lib/security'

describe('Security Utilities', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('detectSuspiciousActivity', () => {
    it('should return not suspicious for normal activity', () => {
      const result = detectSuspiciousActivity()
      expect(result.suspicious).toBe(false)
      expect(result.reason).toBeUndefined()
    })
  })

  describe('isTransientError', () => {
    it.each([
      { status: 408 },
      { status: 429 },
      { status: 500 },
      { status: 502 },
      { status: 503 },
      { status: 504 },
      { name: 'TypeError', message: 'Failed to fetch' },
      { code: 'ECONNRESET' },
      { code: 'ETIMEDOUT' },
      { code: 'ENETUNREACH' },
    ])('should identify transient error: %j', (error) => {
      expect(isTransientError(error)).toBe(true)
    })

    it.each([
      { status: 400 },
      { status: 401 },
      { status: 403 },
      { status: 404 },
      { name: 'Error', message: 'Generic error' },
      null,
      undefined,
      {},
    ])('should not identify non-transient error: %j', (error) => {
      expect(isTransientError(error)).toBe(false)
    })
  })

  describe('retryAsync', () => {
    const mockOperation = vi.fn()
    const mockOnAttempt = vi.fn()

    beforeEach(() => {
      mockOperation.mockClear()
      mockOnAttempt.mockClear()
    })

    it('should succeed on the first attempt', async () => {
      mockOperation.mockResolvedValue('success')
      const result = await retryAsync(mockOperation)
      expect(result).toBe('success')
      expect(mockOperation).toHaveBeenCalledTimes(1)
    })

    it('should retry on transient errors and eventually succeed', async () => {
      mockOperation
        .mockRejectedValueOnce({ status: 500 })
        .mockRejectedValueOnce({ status: 503 })
        .mockResolvedValue('success')

      const options: IRetryOptions = { maxAttempts: 4, baseDelayMs: 100 }
      const retryPromise = retryAsync(mockOperation, options)

      await vi.advanceTimersByTimeAsync(100 + 200) // 1st retry + 2nd retry delay

      const result = await retryPromise
      expect(result).toBe('success')
      expect(mockOperation).toHaveBeenCalledTimes(3)
    })

    it('should throw after exhausting max attempts', async () => {
      const error = { status: 500, message: 'Server Error' }
      mockOperation.mockRejectedValue(error)

      const options: IRetryOptions = { maxAttempts: 3, baseDelayMs: 100 }
      const retryPromise = retryAsync(mockOperation, options)

      await vi.runAllTimersAsync()

      await expect(retryPromise).rejects.toThrow(error.message)
      expect(mockOperation).toHaveBeenCalledTimes(3)
    })

    it('should not retry on non-transient errors', async () => {
      const error = { status: 400, message: 'Bad Request' }
      mockOperation.mockRejectedValue(error)

      const retryPromise = retryAsync(mockOperation)

      await expect(retryPromise).rejects.toThrow(error.message)
      expect(mockOperation).toHaveBeenCalledTimes(1)
    })

    it('should call onAttempt for each attempt', async () => {
      mockOperation.mockRejectedValue({ status: 500 })
      const options: IRetryOptions = { maxAttempts: 3, baseDelayMs: 100, onAttempt: mockOnAttempt }
      const retryPromise = retryAsync(mockOperation, options)

      await vi.runAllTimersAsync()

      await expect(retryPromise).rejects.toBeDefined()
      expect(mockOnAttempt).toHaveBeenCalledTimes(3)
      expect(mockOnAttempt).toHaveBeenCalledWith(expect.objectContaining({ attempt: 1 }))
      expect(mockOnAttempt).toHaveBeenCalledWith(expect.objectContaining({ attempt: 2 }))
      expect(mockOnAttempt).toHaveBeenCalledWith(expect.objectContaining({ attempt: 3 }))
    })

    it('should respect a custom retryOn function', async () => {
      const customError = { custom: true }
      mockOperation.mockRejectedValue(customError)
      const retryOn = (e: any) => e.custom === true

      const options: IRetryOptions = { maxAttempts: 2, baseDelayMs: 100, retryOn }
      const retryPromise = retryAsync(mockOperation, options)

      await vi.runAllTimersAsync()

      await expect(retryPromise).rejects.toBeDefined()
      expect(mockOperation).toHaveBeenCalledTimes(2)
    })

    it('should apply exponential backoff correctly', async () => {
      const delays: number[] = []
      vi.spyOn(global, 'setTimeout').mockImplementation((cb, ms) => {
        delays.push(ms!)
        return setTimeout(cb, ms) as any
      })

      mockOperation.mockRejectedValue({ status: 500 })
      const options: IRetryOptions = { maxAttempts: 4, baseDelayMs: 100, backoffFactor: 2 }
      const retryPromise = retryAsync(mockOperation, options)

      await vi.runAllTimersAsync()
      await expect(retryPromise).rejects.toBeDefined()

      expect(delays.map(d => Math.round(d))).toEqual([100, 200, 400])
      vi.restoreAllMocks()
    })

    it('should respect maxDelayMs', async () => {
      const delays: number[] = []
      vi.spyOn(global, 'setTimeout').mockImplementation((cb, ms) => {
        delays.push(ms!)
        return setTimeout(cb, ms) as any
      })

      mockOperation.mockRejectedValue({ status: 500 })
      const options: IRetryOptions = { maxAttempts: 5, baseDelayMs: 100, backoffFactor: 3, maxDelayMs: 500 }
      const retryPromise = retryAsync(mockOperation, options)

      await vi.runAllTimersAsync()
      await expect(retryPromise).rejects.toBeDefined()

      expect(delays.map(d => Math.round(d))).toEqual([100, 300, 500, 500])
      vi.restoreAllMocks()
    })

    it('should apply jitter within the expected range', async () => {
      const delays: number[] = []
      vi.spyOn(global, 'setTimeout').mockImplementation((cb, ms) => {
        delays.push(ms!)
        return setTimeout(cb, ms) as any
      })

      mockOperation.mockRejectedValue({ status: 500 })
      const options: IRetryOptions = { maxAttempts: 4, baseDelayMs: 100, jitterMs: 50, backoffFactor: 1 }
      const retryPromise = retryAsync(mockOperation, options)

      await vi.runAllTimersAsync()
      await expect(retryPromise).rejects.toBeDefined()

      expect(delays.length).toBe(3)
      delays.forEach(delay => {
        expect(delay).toBeGreaterThanOrEqual(100) // base
        expect(delay).toBeLessThanOrEqual(150)   // base + jitter
      })
      vi.restoreAllMocks()
    })

    it('should log to the console when log option is true', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { })
      mockOperation.mockRejectedValue({ status: 500 })
      const options: IRetryOptions = { maxAttempts: 3, baseDelayMs: 10, log: true }
      const retryPromise = retryAsync(mockOperation, options)

      await vi.runAllTimersAsync()

      await expect(retryPromise).rejects.toBeDefined()
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[retry]'))
      consoleSpy.mockRestore()
    })
  })
})