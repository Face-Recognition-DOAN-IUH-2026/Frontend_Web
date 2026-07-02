import { bus } from "@/lib/event-bus";

describe("EventBus", () => {
  beforeEach(() => {
    bus["listeners"] = {};
  });

  it("should subscribe and emit events", () => {
    const fn = jest.fn();
    bus.on("auth:required", fn);

    bus.emit("auth:required");

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("should pass arguments to listeners", () => {
    const fn = jest.fn();
    bus.on("auth:success", fn);

    bus.emit("auth:success", "new-token-123");

    expect(fn).toHaveBeenCalledWith("new-token-123");
  });

  it("should return unsubscribe function from on()", () => {
    const fn = jest.fn();
    const unsubscribe = bus.on("auth:required", fn);

    unsubscribe();
    bus.emit("auth:required");

    expect(fn).not.toHaveBeenCalled();
  });

  it("should support multiple listeners on same event", () => {
    const fn1 = jest.fn();
    const fn2 = jest.fn();
    bus.on("auth:required", fn1);
    bus.on("auth:required", fn2);

    bus.emit("auth:required");

    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(1);
  });

  it("should not throw when emitting event with no listeners", () => {
    expect(() => bus.emit("auth:required")).not.toThrow();
  });

  it("should handle off() correctly", () => {
    const fn = jest.fn();
    bus.on("auth:required", fn);
    bus.off("auth:required", fn);

    bus.emit("auth:required");

    expect(fn).not.toHaveBeenCalled();
  });
});
