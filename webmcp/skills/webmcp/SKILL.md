---
name: webmcp
description: Implement WebMCP (the proposed Web Model Context Protocol) on a website so AI agents can use its forms, actions, and features as structured, reliable tools instead of guessing from the screen. Use this skill whenever the user wants to add WebMCP to a site or page, make a website agent-ready or agent-friendly, expose forms or functionality to AI agents, annotate HTML forms for agents, register tools with navigator.modelContext, or asks how to implement WebMCP, the declarative or imperative WebMCP API, user confirmation for agent actions, or how to test WebMCP in the Chrome origin trial. Also trigger when the user mentions WebMCP, an agent-ready website, or making a site usable by browser AI agents like Gemini in Chrome.
---

# Implement WebMCP

This skill adds WebMCP to a website correctly. It is an operating procedure: understand the site, choose the right API, implement it, make it safe, and verify it works.

WebMCP is an early standard. It is in a Chrome origin trial and the spec is a W3C draft. Treat every implementation as progressive enhancement. The site must work perfectly for a visitor whose browser has never heard of WebMCP.

## What WebMCP is

WebMCP lets a web page expose structured tools to an AI agent running in the browser. Instead of the agent looking at the rendered page and guessing what a button does, the page declares its actions directly: here is the tool, here is what it needs, here is what it returns.

Three facts shape every decision below:

1. It is tab-bound and ephemeral. Tools exist only while the page is open. There is no server, no persistence. This is the opposite of regular MCP, which runs on a server and is always reachable.
2. It has two APIs. A declarative API (annotate existing HTML forms) and an imperative API (register tools in JavaScript). They can be combined on one page.
3. It is early. WebMCP requires a secure context (HTTPS), runs in a Chrome 149 origin trial, and is "MCP-inspired" rather than a finished standard. The API surface will move.

You may see a userland library called `webmcp.js`. That is a separate project with its own API. This skill targets the standard browser API (`navigator.modelContext`), because that is what the origin trial exposes and what will ship.

## Step 1: Decide which API to use

Ask one question: does the action already exist as an HTML `<form>`?

- Yes, and the form does the whole job (search, contact, support request, signup): use the declarative API. Less code, less to maintain.
- No. The action is a button, a sequence, a state change, or anything not expressible as one form submission: use the imperative API.
- Both: use both. A page can annotate its forms and register JavaScript tools at the same time.

Default to declarative when it fits. The less custom JavaScript, the less to break when the spec moves.

## Step 2 (Path A): Declarative API

Annotate a standard HTML form. The form keeps working normally for humans. The annotations make it a tool for agents.

Form-level attributes on `<form>`:

- `toolname` (required): a short name for the tool, based on what it does.
- `tooldescription` (required): what action the tool takes and why.
- `toolautosubmit` (optional): submit and navigate automatically when an agent invokes it. Leave it off for anything the user should review first.

Field-level attributes on inputs, selects, and textareas:

- `toolparamdescription`: describes the field as a property in the generated JSON Schema.
- `toolparamtitle`: sets the property title.

If you omit `toolparamdescription`, the browser falls back to the field's `<label>`, then to its `aria-description`. Good labels mean fewer annotations.

Example:

```html
<form toolname="support_request"
      tooldescription="Submit a request for customer support."
      action="/submit">

  <label for="firstName">First name</label>
  <input type="text" name="firstName" id="firstName">

  <label for="lastName">Last name</label>
  <input type="text" name="lastName" id="lastName">

  <select name="team" required
          toolparamtitle="Support type"
          toolparamdescription="Determines which team this request is routed to.">
    <option value="Customer happiness team">Return my purchase.</option>
    <option value="Distribution team">Check where my package is.</option>
    <option value="Website support team">Get help with the website.</option>
  </select>

  <button type="submit">Submit</button>
</form>
```

That is the whole job for a form-shaped action. No JavaScript.

## Step 3 (Path B): Imperative API

Register a tool in JavaScript with `navigator.modelContext.registerTool()`.

A tool has:

- `name` (required): 1 to 128 characters, using only letters, numbers, `_`, `-`, and `.`.
- `description` (required): what the tool does, in plain language.
- `title` (optional): a human-readable label.
- `inputSchema`: a JSON Schema object describing the inputs.
- `execute` (required): the function that runs the tool.
- `annotations` (optional): hints about the tool's behavior (see Step 5).

Example:

```javascript
navigator.modelContext.registerTool({
  name: 'add_todo',
  description: 'Add an item to the to-do list.',
  inputSchema: {
    type: 'object',
    properties: {
      text: { type: 'string', description: 'The to-do item text.' },
    },
    required: ['text'],
  },
  execute: ({ text }) => {
    addTodoToList(text);
    return `Added "${text}" to the list.`;
  },
});
```

The `execute` function receives the parsed input as its first argument. It returns a short string (or a promise resolving to one) describing what happened. That string is what the agent reads back, so make it specific. After the function runs, update the visible page state too, so the agent and the user can both confirm the result.

Register tools that only make sense in a certain page state when that state is active, and remove them when it ends, using an `AbortSignal`:

```javascript
const controller = new AbortController();
navigator.modelContext.registerTool(checkoutTool, { signal: controller.signal });

// when checkout is no longer available:
controller.abort();
```

For most pages, register your tools once at load. Only reach for dynamic registration when a tool genuinely does not apply yet.

## Step 4: Confirm sensitive actions

Anything that spends money, sends a message, deletes data, or is hard to undo should ask the user before it completes.

The `execute` function receives a client object as its second argument. Call `requestUserInteraction` on it to pause for confirmation before doing the work:

```javascript
execute: async ({ amount }, client) => {
  await client.requestUserInteraction(async () => {
    // show the user a confirmation UI and wait for their choice
  });
  processPayment(amount);
  return `Charged ${amount}.`;
}
```

For declarative forms, the equivalent is leaving `toolautosubmit` off, so the user reviews the filled form and submits it themselves.

## Step 5: Make it safe

WebMCP exposes real actions to software acting on a user's behalf. Treat the tool surface like a public API, because that is what it is.

- Never expose a tool that does something you would not let an anonymous visitor do. WebMCP adds no authentication. Your existing auth and server-side checks still have to hold.
- Mark read-only tools with `annotations: { readOnlyHint: true }`. Mark tools that surface text from untrusted sources (reviews, comments, user content) with `annotations: { untrustedContentHint: true }`, so the agent treats that text as data, not instructions.
- Validate strictly in your code. Keep the JSON Schema loose enough to read, and do the real checking inside `execute` with clear error messages the agent can act on.
- Require confirmation for anything destructive or costly (Step 4).
- WebMCP requires HTTPS. It will not run on an insecure origin.

## Step 6: Feature-detect and degrade gracefully

WebMCP is an origin trial. Most visitors will not have it. The site must not depend on it.

```javascript
if ('modelContext' in navigator) {
  // register tools
}
```

Never put functionality a normal user needs behind WebMCP. It is an extra lane for agents, never the only lane.

## Step 7: Verify

- The page works fully with WebMCP unavailable. Test with the flag off.
- Each tool has one clear job. No two tools overlap enough to confuse an agent about which to pick.
- Names and descriptions read in plain language. Distinguish doing from starting: `create_event` creates; `start_event_creation` opens a form.
- Inspect registered tools: `await navigator.modelContext.getTools()`.
- Dry-run a tool: `await navigator.modelContext.executeTool(tool, '{"text": "Buy milk"}')`.
- Sensitive tools prompt for confirmation before acting.
- Destructive actions are reversible or clearly warned.

## Writing good tools

The agent only knows what your names and descriptions tell it. This is where most implementations succeed or fail.

- One function per tool. Split anything that does two things.
- Write positively. "Creates a calendar event for a specific date and time" beats "Don't use this for reminders."
- Use real words, not internal IDs. `shipping: "Express"` beats `shipping_id: 1`.
- Accept raw input. Do not ask the agent to do math or reformat strings. Take what the user would type and parse it yourself.
- Use specific types: `string`, `number`, `enum`. An `enum` tells the agent exactly which values are allowed.
- Trust the agent. Assume it understands a clear description. If a model keeps failing, fix the tool's shape, not the instructions.
- Fail usefully. On a rate limit or error, return a message that tells the agent what to do next, including handing the task back to the user.

## Reference: the API surface

Imperative (`navigator.modelContext`):
- `registerTool(tool, options)` — `tool`: `{ name, description, title?, inputSchema?, execute, annotations? }`. `options`: `{ signal?, exposedTo? }`.
- `getTools()` — list registered tools.
- `executeTool(tool, inputJsonString)` — run a tool manually.
- `ontoolchange` — event fired when the tool set changes.
- `execute(input, client)` — `input` is the parsed args; `client.requestUserInteraction(callback)` pauses for the user.
- `annotations` — `{ readOnlyHint?: boolean, untrustedContentHint?: boolean }`.

Declarative (HTML):
- `<form>`: `toolname`, `tooldescription`, `toolautosubmit`.
- Fields: `toolparamtitle`, `toolparamdescription`.

## Status

WebMCP is a W3C Web Machine Learning Community Group draft (first published February 2026) and is in an origin trial in Chrome 149. The API is not final. Re-check the tool object shape, the declarative attributes, and the confirmation API against the current spec before shipping to production. This skill reflects the spec and Chrome documentation as of May 2026.
