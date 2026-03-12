# AndamanBazaar Deployment Runbook

## Quick Reference

**Repository**: shahidster1711/AndamanBazaarApp
**Primary Domain**: andamanbazaar.in
**Staging Domain**: staging.andamanbazaar.in
**Hosting**: Firebase Hosting (primary), Docker (alternative)

---

## Architecture Overview

### Application Type
- **Frontend**: Vite + React SPA (Single Page Application)
- **Build Output**: Static files in `dist/` directory
- **Backend**: Supabase (external service - auth, database, storage, edge functions)
- **Runtime**: No server runtime required (pure static hosting)

### Hosting Strategy

| Component | Platform | Purpose |
|-----------|----------|---------|
| Frontend | Firebase Hosting | Global CDN, SSL, SPA routing |
| Backend | Supabase | Auth, Database, Storage, Functions |
| Payments | Cashfree | Payment gateway (client-side + webhooks) |
| Images | Supabase Storage | Image hosting with CDN |

---

## Pre-Deployment Checklist

### Environment Setup

#### 1. Configure GitHub Secrets
Navigate to Settings > Secrets and variables > Actions, add:

**Firebase Configuration:**
```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_SERVICE_ACCOUNT=<JSON service account key>
```

**Staging Environment:**
```
STAGING_SUPABASE_URL=https://staging-project.supabase.co
STAGING_SUPABASE_ANON_KEY=xxx
STAGING_SUPABASE_PROJECT_ID=xxx
STAGING_GEMINI_API_KEY=xxx
```

**Production Environment:**
```
PROD_SUPABASE_URL=https://production-project.supabase.co
PROD_SUPABASE_ANON_KEY=xxx
PROD_SUPABASE_PROJECT_ID=xxx
PROD_GEMINI_API_KEY=xxx
```

#### 2. Firebase Project Setup
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Initialize (if not done)
firebase init hosting

# Select project
firebase use your-project-id
```

#### 3. Supabase Production Setup
- Create production Supabase project
- Apply all migrations: `supabase db push`
- Deploy edge functions: `supabase functions deploy`
- Configure Cashfree webhooks for production

#### 4. Domain Configuration
In Firebase Console:
1. Go to Hosting > Custom domains
2. Add `andamanbazaar.in`
3. Add `www.andamanbazaar.in` (redirect to apex)
4. Add `staging.andamanbazaar.in`
5. Follow DNS verification steps

---

## Deployment Workflows

### Standard Deployment (Git Push)

```
main branch push → Production deploy
staging branch push → Staging deploy
```

### Manual Deployment

```bash
# Deploy to staging
gh workflow run deploy.yml -f environment=staging

# Deploy to production
gh workflow run deploy.yml -f environment=production
```

### Local Build & Deploy

```bash
# Build for production
npm ci
npm run build

# Test locally
npm run preview

# Deploy to Firebase manually
firebase deploy --only hosting
```

---

## Build Process

### Step-by-Step

1. **Install Dependencies**
   ```bash
   npm ci
   ```

2. **Run Quality Checks**
   ```bash
   npm run lint          # ESLint
   npx tsc --noEmit      # TypeScript
   npm run test:unit     # Unit tests
   npm run test:integration  # Integration tests
   ```

3. **Build Application**
   ```bash
   npm run build
   ```

4. **Verify Build**
   ```bash
   ls -la dist/
   cat dist/health.json
   ```

5. **Test Build Locally**
   ```bash
   npm run preview -- --host 0.0.0.0
   # Test at http://localhost:4173
   ```

---

## Environment Configuration

### Environment Files

**`.env.staging`**:
```
VITE_SUPABASE_URL=https://staging-project.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
VITE_SUPABASE_PROJECT_ID=xxx
VITE_CASHFREE_ENV=sandbox
VITE_GOOGLE_GENERATIVE_AI_API_KEY=xxx
```

**`.env.production`**:
```
VITE_SUPABASE_URL=https://prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
VITE_SUPABASE_PROJECT_ID=xxx
VITE_CASHFREE_ENV=production
VITE_GOOGLE_GENERATIVE_AI_API_KEY=xxx
```

### Build-time vs Runtime

- All environment variables prefixed with `VITE_` are **build-time only**
- Values are baked into the JavaScript bundle at build time
- Cannot be changed without rebuilding and redeploying

---

## Health Checks

### Endpoint
```
GET /health.json
```

### Response
```json
{
  "status": "healthy",
  "version": "abc123",
  "timestamp": "2026-03-12T16:34:00Z",
  "environment": "production"
}
```

### Verification Commands
```bash
# Check production
curl https://andamanbazaar.in/health.json

# Check staging
curl https://staging.andamanbazaar.in/health.json
```

---

## Post-Deployment Verification

### Automated Checks (CI/CD)
The deployment workflow automatically verifies:
- Health endpoint returns 200
- JSON response is valid
- Build version matches deployment

### Manual Smoke Tests

After each production deployment:

```bash
# 1. Check main pages load
curl -s https://andamanbazaar.in/ | head -20
curl -s https://andamanbazaar.in/login | grep -i "login"
curl -s https://andamanbazaar.in/listings | grep -i "listing"

# 2. Check static assets
curl -I https://andamanbazaar.in/health.json

# 3. Verify SPA routing (should return index.html)
curl -s https://andamanbazaar.in/nonexistent-page | grep -i "andamanbazaar"
```

### Full Verification Checklist

- [ ] Homepage loads without errors
- [ ] Login page accessible
- [ ] Authentication works (test login)
- [ ] Listings page loads
- [ ] Create listing flow works
- [ ] Image upload works
- [ ] Payment flow works (test with sandbox)
- [ ] Mobile responsive
- [ ] No console errors
- [ ] SSL certificate valid

---

## Troubleshooting

### Build Failures

**TypeScript errors:**
```bash
npx tsc --noEmit
# Fix all type errors before deploying
```

**ESLint errors:**
```bash
npx eslint . --ext .ts,.tsx --fix
# Review and fix linting issues
```

**Test failures:**
```bash
npm run test:unit -- --reporter=verbose
# Identify and fix failing tests
```

### Deployment Failures

**Firebase authentication:**
```bash
firebase login --reauth
firebase use your-project-id
```

**Invalid service account:**
- Verify FIREBASE_SERVICE_ACCOUNT secret is valid JSON
- Check project ID matches
- Ensure service account has Hosting Admin role

**DNS not resolving:**
- Check DNS records are correctly configured
- Verify with: `dig andamanbazaar.in +short`
- Allow 24-48 hours for DNS propagation

### Runtime Issues

**Blank page after deployment:**
- Check browser console for errors
- Verify environment variables are set
- Confirm Supabase connection is working

**API errors:**
- Check Supabase project status
- Verify Cashfree configuration
- Review edge function logs in Supabase dashboard

---

## Staging vs Production

### Staging Environment
- **URL**: https://staging.andamanbazaar.in
- **Supabase**: Staging project with test data
- **Payments**: Cashfree Sandbox
- **Purpose**: Pre-production testing, validation

### Production Environment
- **URL**: https://andamanbazaar.in
- **Supabase**: Production project with live data
- **Payments**: Cashfree Production
- **Purpose**: Live user traffic

### Promotion Workflow

1. Merge feature branch → `staging`
2. Automated deploy to staging
3. Run E2E tests on staging
4. Manual QA validation
5. Create PR: `staging` → `main`
6. Code review and approval
7. Merge to `main` → Automatic production deploy

---

## Performance Monitoring

### Lighthouse CI
Automated performance checks run on every staging deployment.

**View Reports:**
- Check GitHub Actions artifacts
- Or run locally: `npm run test:performance`

### Key Metrics
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Time to Interactive**: < 3.5s
- **Cumulative Layout Shift**: < 0.1

---

## Emergency Procedures

### Quick Rollback

If production deployment has issues:

```bash
# Rollback to previous version via Firebase
firebase hosting:clone andamanbazaar-in:live andamanbazaar-in:live --region us-central1

# Or redeploy previous commit
git checkout <previous-commit-sha>
npm ci && npm run build
firebase deploy --only hosting
```

### Enable Maintenance Mode

```bash
# Create maintenance page
cat > dist/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head><title>Maintenance</title></head>
<body>
  <h1>AndamanBazaar is under maintenance</h1>
  <p>We'll be back shortly. Thank you for your patience.</p>
</body>
</html>
EOF

# Deploy immediately
firebase deploy --only hosting
```

---

## Contact & Escalation

**Primary Owner**: DevOps Team
**Secondary**: Engineering Lead
**Emergency**: On-call engineer

**Monitoring**: Firebase Console, Supabase Dashboard, GitHub Actions

---

## Document History

- **Created**: March 12, 2026
- **Last Updated**: March 12, 2026
- **Version**: 1.0
