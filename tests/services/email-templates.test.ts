import { describe, expect, it } from "vitest";
import { renderInviteEmail } from "@/lib/email-templates";

describe("renderInviteEmail", () => {
  it("includes the heading, body, action label, and action url", () => {
    const html = renderInviteEmail({
      heading: "You've been invited",
      body: "Click below to get started.",
      actionLabel: "Accept invitation",
      actionUrl: "https://example.com/accept-invite?token=abc123",
    });

    expect(html).toContain("You've been invited");
    expect(html).toContain("Click below to get started.");
    expect(html).toContain("Accept invitation");
    expect(html).toContain("https://example.com/accept-invite?token=abc123");
  });

  it("links the action url as the button href", () => {
    const html = renderInviteEmail({
      heading: "Heading",
      body: "Body",
      actionLabel: "Go",
      actionUrl: "https://example.com/go",
    });

    expect(html).toContain('href="https://example.com/go"');
  });
});
