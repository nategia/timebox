import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { createLazyFileRoute } from "@tanstack/react-router";
import { Grip } from "lucide-react";
import { useEffect, useState } from "react";
import {
  LuCheck,
  LuFileQuestion,
  LuPenSquare,
  LuTrash2,
  LuUndo,
} from "react-icons/lu";
import { create } from "zustand";
import {
  DragDropContext,
  Draggable,
  Droppable,
  DropResult,
} from "react-beautiful-dnd";
import { persist } from "zustand/middleware";
import { slice } from "ramda";
import { Progress } from "@/components/progress";
import { Badge } from "@/components/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/dialog";

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
    <div className=" space-y-4 py-4">
      <p>
        1. <strong>Add Tasks:</strong> Type your task in the input field and
        press <em>Enter</em> or click <em>Add Todo</em>.
      </p>
      <p>
        2. <strong>Reorder Tasks:</strong> Click and drag the grip icon to
        reorder tasks by priority.
      </p>
      <p>
        3. <strong>Complete Tasks:</strong> Click the checkmark to mark a task
        as complete.
      </p>
      <p>
        4. <strong>Remove Tasks:</strong> Click the trash can to remove a task
        from the list.
      </p>
      <p>
        5. <strong>Clear All Tasks:</strong> Click <em>Scrap all</em> to clear
        the entire list and start fresh.
      </p>
    </div>
  );
};

const Details = () => {
  return (
    <p className=" text-xs text-muted-foreground text-left w-full">
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

const Header = () => (
  <div className="flex flex-row justify-between items-center p-4  w-full ">
    <h1 className="text-2xl font-bold">Timebox.</h1>
    <Dialog>
      <DialogTrigger>
        <Button variant="outline">
          <div className="space-x-2 flex flex-row items-center">
            <p>Instructions</p>
            <LuFileQuestion />
          </div>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>How to use Timebox</DialogTitle>
        </DialogHeader>
        <Instructions />
        <DialogFooter>
          <Details />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
);

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="bg-background w-full h-full">
      <Header />
      <center>{children}</center>
    </div>
  );
};

function Index() {
  const { todos, addTodo, removeTodo, cleanup, reorderTodos, complete } =
    useTodoStore();
  const [newTodo, setNewTodo] = useState("");
  const [editTodo, setEditTodo] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [progress, setProgress] = useState<number>(0);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) {
      return;
    }
    reorderTodos(result.source.index, result.destination.index);
  };

  const currProgressPercent =
    (todos?.filter((todo) => todo.completed).length / todos?.length) * 100;

  useEffect(() => {
    const timer = setTimeout(() => setProgress(currProgressPercent), 250);
    return () => clearTimeout(timer);
  }, [currProgressPercent]);

  return (
    <Layout>
      <div className="p-0 sm:p-8 bg-background space-y-4 flex-col flex max-w-screen-lg">
        <div className="px-4 py-8 text-center space-y-4">
          <div className="flex flex-col sm:flex-row w-full items-center justify-center p-4 space-x-0 space-y-2 sm:space-x-4 sm:space-y-0">
            <Input
              placeholder="Brain dump of what you need to do today"
              onChange={(e) => setNewTodo(e.target.value)}
              value={newTodo}
              className="w-full bg-white h-12"
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
              className=" w-full sm:w-auto"
            >
              Add Todo
            </Button>
            <Button
              onClick={cleanup}
              variant="secondary"
              className=" w-full sm:w-auto"
            >
              Scrap all
            </Button>
          </div>
        </div>

        {todos.length > 0 && (
          <div className="flex flex-col space-y-4 p-4">
            <div className="flex flex-col space-y-2 p-4">
              <div className="flex flex-row items-center justify-between ">
                <h3 className=" font-bold">Priority levels:</h3>

                <div className="flex flex-row justify-end items-center space-x-2  w-1/2">
                  <Badge className="bg-green-400 hover:bg-green-400/90">
                    High
                  </Badge>
                  <Badge className="bg-yellow-400 hover:bg-yellow-400/90 ">
                    Medium
                  </Badge>
                  <Badge className="bg-red-400 hover:bg-red-400/90">Low</Badge>
                </div>
              </div>
              <div className="flex flex-row items-center justify-between">
                <h3 className=" font-bold">Progress:</h3>

                <div className="flex flex-row justify-end items-center space-x-2  w-1/2">
                  <Progress value={progress} className="rounded-none" />
                  <Badge>{progress ? progress.toFixed(0) : 0}%</Badge>
                </div>
              </div>
            </div>
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="droppable">
                {(provided) => (
                  <ul
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-4"
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
                              className={` transition-opacity fade-in border-l-2 p-4 flex items-center gap-4 ${index < 3 && " border-green-400"} ${index > 2 && index < 6 && "border-yellow-400"} ${index > 5 && " border-red-400"} bg-white`}
                            >
                              <div color="secondary">
                                <Grip />
                              </div>
                              <h2 className="text-lg font-bold">{index + 1}</h2>
                              <div className="flex flex-row w-full text-start h-full">
                                {editTodo === id ? (
                                  <Input
                                    onChange={(e) =>
                                      setEditContent(e.target.value)
                                    }
                                    value={editContent}
                                    className="w-full"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        if (editTodo !== null) {
                                          if (editContent.trim() !== "") {
                                            useTodoStore.setState((state) => ({
                                              todos: state.todos.map((todo) =>
                                                todo.id === id
                                                  ? {
                                                      ...todo,
                                                      content: editContent,
                                                    }
                                                  : todo
                                              ),
                                            }));
                                            setEditTodo(null);
                                            setEditContent("");
                                          }
                                        }
                                      }
                                    }}
                                  />
                                ) : (
                                  <p
                                    style={{
                                      textDecoration: completed
                                        ? "line-through"
                                        : "none",
                                    }}
                                    className="text-sm sm:text-lg"
                                  >
                                    {capitaliseFirstLetter(content)}
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-col sm:flex-row items-center justify-center space-x-0 space-y-2 sm:space-x-2 sm:space-y-0">
                                <Button
                                  size="icon"
                                  variant="outline"
                                  onClick={() => {
                                    setEditTodo(id === editTodo ? null : id);
                                    setEditContent(
                                      capitaliseFirstLetter(content)
                                    );
                                  }}
                                >
                                  {id === editTodo ? (
                                    <LuUndo />
                                  ) : (
                                    <LuPenSquare />
                                  )}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => complete(id)}
                                >
                                  {completed ? <LuUndo /> : <LuCheck />}
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  onClick={() => {
                                    removeTodo(id);
                                  }}
                                >
                                  <LuTrash2 />
                                </Button>
                              </div>
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
        )}
      </div>
    </Layout>
  );
}
