import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Face Recognition Platform</h1>
          <div className="flex gap-4">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium hover:bg-accent rounded-md"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:opacity-90"
            >
              Register
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-4xl font-bold mb-4">
            Face Recognition Platform
          </h2>
          <p className="text-muted-foreground mb-8">
            Secure face enrollment, verification, and identification powered by
            AI and microservices architecture.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/login"
              className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:opacity-90"
            >
              Get Started
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}