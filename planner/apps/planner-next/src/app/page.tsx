import Link from "next/link";

export default function Home() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-heading font-bold text-teal-800 mb-4">
        Andaman Planner Pro
      </h1>
      <p className="text-gray-600 mb-8 text-center max-w-md">
        AI-powered Andaman Islands trip planner. Plan your perfect island getaway in minutes.
      </p>
      <Link
        href={`${basePath}/planner`}
        className="rounded-lg bg-teal-600 px-6 py-3 text-white font-semibold hover:bg-teal-700 transition-colors"
      >
        Start Planning
      </Link>
    </main>
  );
}
