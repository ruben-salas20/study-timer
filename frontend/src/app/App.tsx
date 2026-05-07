// App.tsx — root component
// Renders "Study Timer" heading satisfying T03 smoke test (GREEN after T04)
export default function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-4xl font-bold text-primary">Study Timer</h1>
        <p className="mt-2 text-sage-600">Competitive study timer for friends</p>
      </main>
    </div>
  )
}
