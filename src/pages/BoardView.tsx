export default function BoardView() {
  return (
    <div className="bg-gray-900 min-h-screen text-white flex flex-col">
      <div className="h-1/4 border-b border-gray-700 flex">
        <div className="flex-1 p-4 border-r border-gray-700">
          <h2 className="text-lg font-bold">Scoreboard</h2>
        </div>
        <div className="flex-1 p-4">
          <h2 className="text-lg font-bold">Event Log</h2>
        </div>
      </div>
      <div className="flex-1 p-4">
        <h2 className="text-lg font-bold">Board</h2>
      </div>
    </div>
  )
}
