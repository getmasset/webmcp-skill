# WebMCP Skill

A free, open Claude Code plugin that teaches an AI coding agent how to implement [WebMCP](https://www.getmasset.com/resources/webmcp) on a website correctly.

WebMCP is a proposed web standard that lets a website expose its forms and actions as structured tools, so AI agents can use them reliably instead of guessing from the screen. This skill packages the implementation knowledge: which API to use, how to annotate forms, how to register tools, how to keep sensitive actions safe, and how to make sure nothing breaks for visitors whose browser does not support WebMCP yet.

## Install

Inside Claude Code:

```
/plugin marketplace add getmasset/webmcp-skill
/plugin install webmcp@webmcp-skill
```

Or from your terminal:

```
claude plugin marketplace add getmasset/webmcp-skill
claude plugin install webmcp@webmcp-skill
```

That is the whole setup. From then on, Claude uses the skill automatically whenever you ask it to add WebMCP to a site.

## Use it

Open your site's codebase with Claude Code and ask:

> Add WebMCP to my contact page.

The skill picks the right API, implements it, keeps sensitive actions behind a confirmation, and feature-detects so the page still works for everyone else.

## What's inside

This repo is a Claude Code plugin marketplace with one plugin, `webmcp`, which contains one skill:

- `webmcp/skills/webmcp/SKILL.md` — the implementation knowledge.
- `webmcp/skills/webmcp/examples/declarative-form.html` — a fully annotated HTML form.
- `webmcp/skills/webmcp/examples/imperative-tools.js` — JavaScript tools, including a read-only tool and one that confirms before acting.

## A note on timing

WebMCP is early. It is a W3C draft in a Chrome origin trial, and the API will still change. This skill builds WebMCP as a progressive enhancement, never as something your site depends on. We keep it current with the Chrome origin trial.

## Who made this

Built by [Masset](https://www.getmasset.com), the content home for B2B marketing teams. The web is about to get a second audience. Every site should be ready for it.

Free to use, fork, and share. No email required.
