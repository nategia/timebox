import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { createLazyFileRoute } from "@tanstack/react-router";
import { Grip } from "lucide-react";
import { useState } from "react";
import { LuCheck, LuTrash2 } from "react-icons/lu";
import { create } from "zustand";
import {
  DragDropContext,
  Draggable,
  Droppable,
  DropResult,
} from "react-beautiful-dnd";

type TodoStore = {
  todos: Array<{ id: number; content: string }>;
  addTodo: (content: string) => void;
  removeTodo: (id: number) => void;
  reorderTodos: (startIndex: number, endIndex: number) => void;
  cleanup: () => void;
};

const useTodoStore = create<TodoStore>((set, get) => ({
  todos: [],
  addTodo: (content) => {
    const id = get().todos.length;

    set((state) => ({
      todos: [...state.todos, { id, content }],
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
  cleanup: () => {
    set({ todos: [] });
  },
}));

export const Route = createLazyFileRoute("/")({
  component: Index,
});

function Index() {
  const { todos, addTodo, removeTodo, cleanup, reorderTodos } = useTodoStore();
  const [newTodo, setNewTodo] = useState("");

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) {
      return;
    }
    reorderTodos(result.source.index, result.destination.index);
  };
  return (
    <div className="p-8">
      <div className="bg-amber-100 p-8 w-full rounded-md text-center space-y-4">
        <h1 className="p-4 text-2xl font-bold">Don't waste time, Timebox.</h1>
        <div className="flex flex-row w-full items-center justify-center space-x-4">
          <Input
            placeholder="brain dump of what you need to do today"
            onChange={(e) => setNewTodo(e.target.value)}
            value={newTodo}
            className="w-full"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault(); // Optionally, prevent default action
                if (newTodo.trim()) {
                  addTodo(newTodo);
                  setNewTodo(""); // Clear the input
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
          >
            Add Todo
          </Button>
          <Button onClick={cleanup} variant="outline">
            Clean up
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
                {todos?.map((todo, index) => (
                  <Draggable
                    key={todo.id}
                    draggableId={todo.id.toString()}
                    index={index}
                  >
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className="p-4 flex items-center gap-4 border bg-background"
                      >
                        <Button variant="ghost" size="icon">
                          <Grip />
                        </Button>
                        <h2 className="text-xl font-bold">{index + 1}</h2>
                        <div className="flex flex-row w-full text-start p-4 h-full">
                          <p>{todo.content}</p>
                        </div>
                        <Button variant="outline" size="lg" onClick={() => {}}>
                          <LuCheck />
                        </Button>
                        <Button
                          variant="destructive"
                          size="lg"
                          onClick={() => {
                            removeTodo(todo.id);
                          }}
                        >
                          <LuTrash2 />
                        </Button>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </ul>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    </div>
  );
}
