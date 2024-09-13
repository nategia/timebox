import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { createLazyFileRoute } from "@tanstack/react-router";
import { ChevronsUpDown, Grip } from "lucide-react";
import { useState } from "react";
import { LuCheck, LuTrash2 } from "react-icons/lu";
import { create } from "zustand";
import {
  DragDropContext,
  Draggable,
  Droppable,
  DropResult,
} from "react-beautiful-dnd";
import { persist } from "zustand/middleware";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/collapsible";
import { slice } from "ramda";

type TodoStore = {
  todos: Array<{ id: number; content: string; completed: boolean }>;
  addTodo: (content: string) => void;
  removeTodo: (id: number) => void;
  reorderTodos: (startIndex: number, endIndex: number) => void;
  complete: (id: number) => void;
  cleanup: () => void;
};

const useTodoStore = create(
  persist<TodoStore>(
    (set, get) => ({
      todos: [],
      addTodo: (content) => {
        const id = get().todos.length;

        set((state) => ({
          todos: [...state.todos, { id, content, completed: false }],
        }));
      },
      removeTodo: (id) => {
        set((state) => ({
          todos: state.todos.filter((todo) => todo.id !== id),
        }));
      },
      reorderTodos: (startIndex, endIndex) => {
        set((state) => {
          const todos = Array.from(state.todos);
          const [removed] = todos.splice(startIndex, 1);
          todos.splice(endIndex, 0, removed);
          return { todos };
        });
      },
      complete: (id) => {
        const currTodo = get().todos.find((todo) => todo.id === id);
        if (currTodo) {
          set((state) => ({
            todos: state.todos.map((todo) =>
              todo.id === id
                ? { ...todo, completed: !currTodo.completed }
                : todo
            ),
          }));
        }
      },
      cleanup: () => {
        set({ todos: [] });
      },
    }),
    {
      name: "todo-storage",
    }
  )
);

const Instructions = () => {
  return (
    <Collapsible>
      <div className="p-4 bg-gray-100 rounded-md text-left space-y-2">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="flex flex-row justify-between w-full"
          >
            <h2 className="text-xl font-bold">How to Use Timebox</h2>
            <ChevronsUpDown />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2">
          <p>
            1. <strong>Add Tasks:</strong> Type your task in the input field and
            press <em>Enter</em> or click <em>Add Todo</em>.
          </p>
          <p>
            2. <strong>Reorder Tasks:</strong> Click and drag the grip icon to
            reorder tasks by priority.
          </p>
          <p>
            3. <strong>Complete Tasks:</strong> Click the checkmark to mark a
            task as complete.
          </p>
          <p>
            4. <strong>Remove Tasks:</strong> Click the trash can to remove a
            task from the list.
          </p>
          <p>
            5. <strong>Clear All Tasks:</strong> Click <em>Scrap all</em> to
            clear the entire list and start fresh.
          </p>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

const Details = () => {
  return (
    <p className="p-4 text-sm text-muted-foreground text-left w-full">
      This is a simple todo app that uses{" "}
      <a
        href="https://tanstack.com/query/v4"
        target="_blank"
        rel="noreferrer"
        className="underline text-blue-600 hover:text-blue-800"
      >
        TanStack Query
      </a>{" "}
      and{" "}
      <a
        href="https://tanstack.com/router/v1"
        target="_blank"
        rel="noreferrer"
        className="underline text-blue-600 hover:text-blue-800"
      >
        TanStack Router
      </a>{" "}
      to manage the state. It uses{" "}
      <a
        href="https://github.com/atlassian/react-beautiful-dnd"
        target="_blank"
        rel="noreferrer"
        className="underline text-blue-600 hover:text-blue-800"
      >
        react-beautiful-dnd
      </a>{" "}
      for drag and drop functionality.
    </p>
  );
};

const capitaliseFirstLetter = (str: string) =>
  slice(0, 1, str).toUpperCase() + slice(1, Infinity, str);

export const Route = createLazyFileRoute("/")({
  component: Index,
});

function Index() {
  const { todos, addTodo, removeTodo, cleanup, reorderTodos, complete } =
    useTodoStore();
  const [newTodo, setNewTodo] = useState("");

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) {
      return;
    }
    reorderTodos(result.source.index, result.destination.index);
  };
  return (
    <div className="p-8 min-h-screen bg-background flex-col flex flex-grow">
      <div className="bg-background p-8 w-full rounded-md text-center space-y-4">
        <h1 className="p-4 text-2xl font-bold">Don't waste time, Timebox.</h1>

        <Instructions />
        <Details />
        <div className="flex flex-row w-full items-center justify-center space-x-4 p-4 bg-background">
          <Input
            placeholder="brain dump of what you need to do today"
            onChange={(e) => setNewTodo(e.target.value)}
            value={newTodo}
            className="w-full"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (newTodo.trim()) {
                  addTodo(newTodo);
                  setNewTodo("");
                }
              }
            }}
          />
          <Button
            onClick={() => {
              addTodo(newTodo);
              setNewTodo("");
            }}
            type="submit"
            disabled={!newTodo}
          >
            Add Todo
          </Button>
          <Button onClick={cleanup} variant="secondary">
            Scrap all
          </Button>
        </div>
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="droppable">
            {(provided) => (
              <ul
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-2"
              >
                {todos?.map(({ id, content, completed }, index) => {
                  return (
                    <Draggable
                      key={id}
                      draggableId={id.toString()}
                      index={index}
                    >
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className="p-4 flex items-center gap-4 border bg-amber-100"
                        >
                          <div color="secondary">
                            <Grip />
                          </div>
                          <h2 className="text-xl font-bold">{index + 1}</h2>
                          <div className="flex flex-row w-full text-start p-4 h-full">
                            {/* <Textarea
                              style={{
                                textDecoration: completed
                                  ? "line-through"
                                  : "none",
                              }}
                            >
                              {capitaliseFirstLetter(content)}
                            </Textarea> */}
                            <p
                              style={{
                                textDecoration: completed
                                  ? "line-through"
                                  : "none",
                              }}
                            >
                              {capitaliseFirstLetter(content)}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="lg"
                            onClick={() => complete(id)}
                          >
                            <LuCheck />
                          </Button>
                          <Button
                            variant="destructive"
                            size="lg"
                            onClick={() => {
                              removeTodo(id);
                            }}
                          >
                            <LuTrash2 />
                          </Button>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </ul>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    </div>
  );
}
