import { createLazyFileRoute } from "@tanstack/react-router";

export const Route = createLazyFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="p-8">
      <div className="bg-amber-200 p-8 w-full rounded-md text-center">
        <h1 className="text-gray-800">Timebox test</h1>
      </div>
    </div>
  );
}
