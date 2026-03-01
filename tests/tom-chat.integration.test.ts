import { beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

beforeAll(() => {
  process.env.DATABASE_URL = "file:./prisma/tom.db";
});

describe("TOM chat API", () => {
  it("responds to smalltalk without hallucinated numbers", async () => {
    const { POST } = await import("../app/api/tom/chat/route");
    const req = new NextRequest("http://localhost/api/tom/chat", {
      method: "POST",
      body: JSON.stringify({ prompt: "how are you?" }),
    });
    const res = await POST(req);
    const json = await res.json();
    expect(json.response).toBeTruthy();
    expect(json.rich).toBeTruthy();
  });

  it("responds to PTL summary request", async () => {
    const { POST } = await import("../app/api/tom/chat/route");
    const req = new NextRequest("http://localhost/api/tom/chat", {
      method: "POST",
      body: JSON.stringify({ prompt: "ptl summary" }),
    });
    const res = await POST(req);
    const json = await res.json();
    expect(json.rich?.title).toBeTruthy();
  });
});
