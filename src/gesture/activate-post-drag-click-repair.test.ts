/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  activatePostDragClickRepair,
  deactivatePostDragClickRepairForTests,
} from "./activate-post-drag-click-repair";

describe("activatePostDragClickRepair", () => {
  afterEach(() => {
    deactivatePostDragClickRepairForTests();
  });

  it("synthesizes click when pointerup does not produce one", async () => {
    const sheet = document.createElement("div");
    sheet.className = "sheet";
    document.body.appendChild(sheet);

    const button = document.createElement("button");
    button.type = "button";
    document.body.appendChild(button);

    const onClick = vi.fn();
    button.addEventListener("click", onClick);

    activatePostDragClickRepair(sheet);

    button.dispatchEvent(
      new PointerEvent("pointerdown", {
        pointerId: 1,
        clientX: 10,
        clientY: 10,
        bubbles: true,
        button: 0,
      }),
    );
    button.dispatchEvent(
      new PointerEvent("pointerup", {
        pointerId: 1,
        clientX: 10,
        clientY: 10,
        bubbles: true,
        button: 0,
      }),
    );

    expect(onClick).not.toHaveBeenCalled();

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });

    expect(onClick).toHaveBeenCalledTimes(1);

    sheet.remove();
    button.remove();
  });

  it("does not double-fire when click already follows pointerup", async () => {
    const sheet = document.createElement("div");
    sheet.className = "sheet";
    document.body.appendChild(sheet);

    const button = document.createElement("button");
    button.type = "button";
    document.body.appendChild(button);

    const onClick = vi.fn();
    button.addEventListener("click", onClick);

    activatePostDragClickRepair(sheet);

    button.dispatchEvent(
      new PointerEvent("pointerdown", {
        pointerId: 2,
        clientX: 10,
        clientY: 10,
        bubbles: true,
        button: 0,
      }),
    );
    button.dispatchEvent(
      new PointerEvent("pointerup", {
        pointerId: 2,
        clientX: 10,
        clientY: 10,
        bubbles: true,
        button: 0,
      }),
    );
    button.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
      }),
    );

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });

    expect(onClick).toHaveBeenCalledTimes(1);

    sheet.remove();
    button.remove();
  });

  it("synthesizes click on arbitrary elements, not only buttons", async () => {
    const sheet = document.createElement("div");
    sheet.className = "sheet";
    document.body.appendChild(sheet);

    const target = document.createElement("div");
    target.dataset.testid = "custom-target";
    document.body.appendChild(target);

    const onClick = vi.fn();
    target.addEventListener("click", onClick);

    activatePostDragClickRepair(sheet);

    target.dispatchEvent(
      new PointerEvent("pointerdown", {
        pointerId: 4,
        clientX: 10,
        clientY: 10,
        bubbles: true,
        button: 0,
      }),
    );
    target.dispatchEvent(
      new PointerEvent("pointerup", {
        pointerId: 4,
        clientX: 10,
        clientY: 10,
        bubbles: true,
        button: 0,
      }),
    );

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });

    expect(onClick).toHaveBeenCalledTimes(1);

    sheet.remove();
    target.remove();
  });

  it("synthesizes click on canvas when pointerup does not produce one", async () => {
    const sheet = document.createElement("div");
    sheet.className = "sheet";
    document.body.appendChild(sheet);

    const canvas = document.createElement("canvas");
    document.body.appendChild(canvas);

    const onClick = vi.fn();
    canvas.addEventListener("click", onClick);

    activatePostDragClickRepair(sheet);

    canvas.dispatchEvent(
      new PointerEvent("pointerdown", {
        pointerId: 5,
        clientX: 10,
        clientY: 10,
        bubbles: true,
        button: 0,
      }),
    );
    canvas.dispatchEvent(
      new PointerEvent("pointerup", {
        pointerId: 5,
        clientX: 10,
        clientY: 10,
        bubbles: true,
        button: 0,
      }),
    );

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });

    expect(onClick).toHaveBeenCalledTimes(1);

    sheet.remove();
    canvas.remove();
  });

  it("ignores taps that start on the sheet", async () => {
    const sheet = document.createElement("div");
    sheet.className = "sheet";
    const inside = document.createElement("button");
    inside.type = "button";
    sheet.appendChild(inside);
    document.body.appendChild(sheet);

    const onClick = vi.fn();
    inside.addEventListener("click", onClick);

    activatePostDragClickRepair(sheet);

    inside.dispatchEvent(
      new PointerEvent("pointerdown", {
        pointerId: 3,
        clientX: 10,
        clientY: 10,
        bubbles: true,
        button: 0,
      }),
    );
    inside.dispatchEvent(
      new PointerEvent("pointerup", {
        pointerId: 3,
        clientX: 10,
        clientY: 10,
        bubbles: true,
        button: 0,
      }),
    );

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });

    expect(onClick).not.toHaveBeenCalled();

    sheet.remove();
  });
});
