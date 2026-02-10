# TERP Customer Interview: The Master Analysis & Product Roadmap

**Document ID:** TERP-MASTER-20260130-FINAL  
**Date:** January 30, 2026  
**Author:** Manus AI  
**Status:** Final Consolidated Report  
**Classification:** Internal Strategic Document

---

## Introduction: The Single Source of Truth

This document represents the definitive, consolidated analysis of the 18-minute customer interview conducted on January 29, 2026. It synthesizes all prior analyses—including the exhaustive line-by-line review, feature cross-referencing, and UX/UI design recommendations—into a single, cohesive master document. Its purpose is to serve as the sole reference for all strategic and tactical decisions moving forward, ensuring every team member, human or AI, operates from the same complete and nuanced understanding of the customer's needs, the business context, and the emotional landscape of the project.

### The Core Thesis: A High-Stakes Partnership

The central finding is that the TERP project is not a typical software development effort; it is a **product being co-created within a deeply personal, high-stakes partnership.** The developer and customer are friends, and their interactions are colored by patience, disappointment, and shared history. This is compounded by the scale of the business—a multi-million dollar operation with significant cash flow complexity—and the presence of an unseen, critical stakeholder ("Tigger") who has already had a negative reaction to an incomplete version of the product.

### The "Tetris" Mental Model

The customer's description of their job as "Tetris" is the guiding metaphor for the entire product strategy. The homepage must be a cockpit that provides immediate answers to four critical questions:

1.  **What are you out of?** (Low Stock)
2.  **What do you have too much of?** (Overstock)
3.  **What's about to go bad?** (Aging Inventory)
4.  **What am I going to lose money on?** (Client Debt Risk)

This model dictates a shift from a report-oriented system to an **action-oriented, decision-support tool.**

---


## Part 1: Exhaustive Interview Analysis (The Unabridged Version)

This section provides the complete, unabridged analysis of the interview, capturing the critical subtext, emotional landscape, and implied business context.

### 1.1 The Emotional Landscape: Patience, Disappointment, and Validation

To understand the feedback, one must first understand the emotional state of the participants.

*   **The Customer is Patient and Encouraging.** The interview opens with the customer proactively offering the developer more time: "days or a week, like, I don't mind... waiting buddy" [00:00.0]. This is the voice of a supportive friend, not an impatient client. They end the call with "Love you, bud" [18:03.2].
*   **The Customer is Also Disappointed.** Despite their patience, frustration is clear: "I'm pretty disappointed that this isn't working yet" [16:28.6]. This is immediately softened with encouragement, but the sting is real. The core inventory functionality is still broken.
*   **The Developer is Seeking Validation.** The developer's opening remarks reveal a need for reassurance: "I've kind of validated that I'm not just being a total dummy about some of this stuff" [00:32.5]. They are a creator looking for validation that they are on the right track.
*   **The Customer is Highly Engaged.** The customer's desire for involvement is a recurring theme: "I love giving feedback, so I'm ready" [00:24.3]. This is a gift; the customer is an active, enthusiastic partner.

### 1.2 The Unseen Stakeholder: The Ghost of "Tigger"

A critical, previously under-reported element is the presence of an unseen stakeholder named "Tigger." The developer's anxiety about showing Tigger an incomplete product ("I don't want to freak Tigger out with a half done thing. Like I already did once" [01:30.1]) reveals a significant external pressure. Tigger has already had a negative reaction, creating a powerful incentive to reach a state of polished stability.

### 1.3 The "Tetris" Mental Model Deconstructed

The customer's analogy arises from their current, inefficient workflow: **scrolling a broken inventory list to manually perform a mental business analysis.** The new homepage must be a **replacement for a painful, multi-step workaround** involving a clunky "list generator" [03:28.4]. Its success will be measured by how quickly it answers the four Tetris questions.

### 1.4 Exhaustive Thematic Analysis

*   **Theme: Simplicity and Nomenclature (The User is Not an Accountant).** The customer consistently pushes for simplicity and rejects jargon. They don't know what "AR/AP" means [14:36.1] and explicitly ask for fewer options on the Leaderboard [11:35.6]. The entire application needs a "plain language" audit.
*   **Theme: The Leaderboard (Excitement Tempered by Confusion).** The Leaderboard is a winning concept, but the execution is too complex. The customer is excited ("I love it") but confused by the metrics ("what's reliability"). The debt warning system was a prior promise [11:21.4] and is a top priority.
*   **Theme: Business Operations and Context (A Multi-Million Dollar Operation).** The AR/AP dashboard shows **$2.49M in AR** and **$1.75M in AP**, with 96 overdue invoices. This is a tool to manage a serious business. Bugs are not minor inconveniences; they are crippling failures.
*   **Theme: The Developer's Role (Guide and Interpreter).** The developer is not just taking notes; they are actively guiding the conversation, reframing needs, and managing expectations. This collaborative dynamic is a project strength.

---


## Part 2: Consolidated Feature Analysis & Implementation Roadmap

This section synthesizes all feature requests, bug reports, and UX feedback into a single, actionable roadmap, cross-referenced against the existing codebase.

### 2.1 Summary by Effort Level

| Category | Count | Effort |
|----------|-------|--------|
| **Quick Wins** (config/styling only) | 6 | ~4 hours |
| **Minor Enhancements** (small code changes) | 5 | ~14 hours |
| **New Features** (significant work) | 4 | ~40+ hours |
| **Deprioritized** (customer said "later") | 3 | N/A |

### 2.2 Implementation Roadmap

#### Phase 1: The Foundation (Critical Path)

| Task | Effort | Owner | Justification |
|------|--------|-------|---------------|
| **Fix Inventory Loading (BUG-040)** | TBD | Backend | **THE #1 BLOCKER.** The customer is "pretty disappointed" this isn't working. Nothing else matters until the data is reliable. |

#### Phase 2: Quick Wins (Day 1 Post-Fix)

| Task | Effort | Owner | Justification |
|------|--------|-------|---------------|
| Create "Owner Dashboard" Preset | 30 min | Frontend | Directly addresses customer's #1 priority. |
| Enable `AgingInventoryWidget` | 5 min | Config | Customer explicitly requested "focus on me" for old items. |
| Enable `ClientDebtLeaderboard` | 5 min | Config | Supports visibility into debt quality. |
| Enable `MatchmakingOpportunitiesWidget` | 5 min | Config | Addresses "who we haven't seen in a while." |
| Hide Unused Client Fields | 15 min | Config | Customer doesn't use email/address. |
| Deprioritize Calendar | 0 min | PM | Customer said "later version thing." |

**Total Phase 2 Effort: ~1 hour**

#### Phase 3: Minor Enhancements (Week 1)

| Task | Effort | Owner | Justification |
|------|--------|-------|---------------|
| Inventory Price Bracket Grouping | 4 hr | Full-stack | Directly requested feature for the dashboard. |
| Leaderboard Metric Tooltips | 3 hr | Frontend | Addresses customer confusion ("We'll need an explanation"). |
| Aging Inventory "Focus" Styling | 2 hr | Frontend | Adds visual emphasis to meet "focus on me" request. |
| Payment Permission Check | 2 hr | Full-stack | Security/workflow for accounting staff. |
| Simplified Price Filtering | 3 hr | Frontend | Addresses pain point with the "list generator." |

**Total Phase 3 Effort: ~14 hours**

#### Phase 4: New Features (Week 2-3)

| Task | Effort | Owner | Justification |
|------|--------|-------|---------------|
| **Debt Warning System** | 16 hr | Full-stack | **High-priority new feature.** Follow-up on a prior promise. |
| Default Landing Page Preference | 4 hr | Full-stack | Convenience feature requested by customer. |
| Client Login Name Field | 4 hr | Full-stack | Low-priority but requested for tracking. |

**Total Phase 4 Effort: ~24 hours**

#### Phase 5: Polish (Later)

| Task | Effort | Owner | Justification |
|------|--------|-------|---------------|
| Metric Consolidation / Simple View | 8 hr | Frontend | Addresses complexity but is a "later" concern. |

### 2.3 Genuinely New Features vs. Enhancements

*   **New Features (Require significant new code):**
    1.  **Debt Warning System (NF-1):** The most important new feature.
    2.  **Default Landing Page Preference (NF-2):** User setting.
    3.  **Client Login Name Field (NF-3):** New schema field.
    4.  **Metric Consolidation (NF-4):** UX simplification.
*   **Enhancements (Modify existing components):**
    1.  **Inventory Category Price Bracket Grouping (ME-1):** Modify `InventorySnapshotWidget`.
    2.  **Leaderboard Metric Tooltips (ME-2):** Add tooltips to `LeaderboardPage`.
    3.  **Aging Inventory "Focus" Styling (ME-3):** Add CSS to `AgingInventoryWidget`.
    4.  **Payment Permission Check (ME-4):** Add role check to `ReceivePaymentModal`.
    5.  **Simplify Price Category Filtering (ME-5):** Improve the existing filter UI.

---


## Part 3: UX/UI Design Recommendations

This section details the design principles and specific mockups derived from the customer feedback.

### 3.1 Core Design Principles

1.  **Action-Oriented, Not Report-Oriented:** The customer doesn't want to "analyze" data; they want to know **what to do**. Widgets should highlight items needing attention and be clickable to take action.
2.  **Simplicity Over Comprehensiveness:** The customer explicitly requested fewer options. The default view should be minimal, with the ability to expand for more detail.
3.  **Quick Glance, Then Drill Down:** The dashboard should answer questions at a glance, with clear click-through paths to detailed pages.
4.  **Mobile-First Mindset:** The customer uses their phone for some tasks, so the dashboard must be fully responsive and prioritize a vertical layout.
5.  **Data First, Not AI:** The customer wants to see the important details, not have a system pretend it can suggest what's most important. The UI should present data clearly and let the user make the decisions.

### 3.2 Recommended MVP Homepage Layout (Simplified Command Center)

This layout is a simplified version of the "Command Center" mockup, focusing on clean data presentation without any recommendation logic.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                   SIMPLIFIED COMMAND CENTER HOMEPAGE                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────┐  ┌─────────────────────────┐               │
│  │   FINANCIALS            │  │   AGING INVENTORY       │               │
│  │   - Cash: $1.2M         │  │   - Batch #123 (92 days)│               │
│  │   - Payables: $1.75M    │  │   - Batch #145 (85 days)│               │
│  │   - Receivables: $2.49M │  │   - Batch #167 (78 days)│               │
│  │   - Net: $738k          │  │   (Simple list, oldest first)           │
│  └─────────────────────────┘  └─────────────────────────┘               │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                    INVENTORY SNAPSHOT                                ││
│  │   (Table with Categories and Price Brackets)                         ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                    CLIENT DEBT                                       ││
│  │   (Table showing top debtors, total balance, oldest invoice age)     ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                    RECENT ORDERS (LAST 7 DAYS)                       ││
│  │   (Simple table of recent order activity)                            ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

This design directly addresses the "Data First" principle by removing all subjective indicators ("Focus Items," "Needs attention," color-coded alerts) and presenting clean, objective tables of information.

---


## Appendices

### Appendix A: Full Interview Transcript

```
[00:00.0 - 00:04.8] Client: days or a week, like, I don't mind, um, uh, waiting buddy.
[00:04.8 - 00:09.5] Client: Like, like there's no point in spinning your wheels if you need a couple more hours or whatever.
[00:10.0 - 00:15.8] Dev: Well, I mean, I think the fact is like, it could just a couple more hours would always be useful.
[00:15.9 - 00:22.8] Dev: And, um, that I still need kind of, I need this feedback.
[00:23.0 - 00:24.2] Dev: Um, okay, great.
[00:24.3 - 00:26.0] Client: I love giving feedback, so I'm ready.
[00:26.5 - 00:26.8] Dev: Cool.
[00:26.9 - 00:28.9] Dev: I, yeah, I appreciate that.
[00:29.9 - 00:32.4] Dev: I feel your patience and, uh, I'm feeling it.
[00:32.5 - 00:35.7] Dev: I feel actually like pretty good about it now.
[00:35.8 - 00:42.4] Dev: Um, that I've kind of validated that I'm not just being a total dummy about some of this stuff.
[00:42.6 - 00:59.6] Dev: Um, but really what I want to do is just go through these, go through all the sidebar things. You tell me actually what feels helpful versus what is just like, get rid of it completely or like stash it for far later.
[01:00.0 - 01:06.7] Dev: Uh, and also some of the like nomenclature stuff, like I'm still kind of trying to figure out.
[01:08.2 - 01:14.8] Dev: The, I can also add, add, uh, I can have Tigger over or we can do a, I don't know, can you do a three way signal call?
[01:16.6 - 01:17.2] Client: I don't know.
[01:17.4 - 01:18.4] Dev: No, I don't think so.
[01:19.1 - 01:25.1] Client: I mean, maybe, I think you can. I mean, I've done, I've done four way signal video calls before.
[01:26.2 - 01:27.3] Dev: Oh, I guess you have a group.
[01:27.8 - 01:28.7] Client: Yeah. That makes sense.
[01:30.1 - 01:33.5] Dev: Well, I don't want to freak Tigger out with a half done thing. Like I already did once.
[01:35.2 - 01:43.3] Dev: So we already talked about the dashboard. Um, when you log in to this application, what's the first thing that you want to see?
[01:44.8 - 01:48.2] Client: Inventory, dashboard, cash.
[01:49.1 - 02:05.6] Client: Uh, I was just going to open up my current laptop. It doesn't really matter what I probably inventory would be where I'd like it to pop up, you know, just because that's the thing we scroll through the most, like just understanding who we need to pay. And, and, um, yeah.
[02:06.3 - 02:10.8] Client: Um, and what's aging and like, what do I need to focus on with my day?
[02:10.9 - 02:18.9] Client: Because it's basically this job is like Tetris and it's like, what are you out of? What do you have too much of what's about to go bad? What am I going to lose money on?
[02:19.6 - 02:20.0] Dev: Yeah.
[02:20.2 - 02:25.6] Dev: So that can we actually unpack that for a second that this actually feels really helpful.
[02:25.7 - 02:26.0] Client: Okay.
[02:26.1 - 02:33.6] Dev: So inventory right now is kind of your like homepage because of all the things that you just mentioned. Right.
[02:34.5 - 02:42.0] Dev: Um, but conceptually here, like you aren't going to have to scroll through inventory to figure out who you're going to have to pay. Right.
[02:42.5 - 03:00.2] Client: Or yeah, I can conceptually like organize it by what is old or what I own or what, um, uh, I'm low on, like I'm low on candy ends from five to seven.
[03:00.5 - 03:11.6] Dev: Okay. So, um, what I hear low on patch feature is not actually in inventory that might be in needs or something, but yeah. Right.
[03:12.0 - 03:27.1] Dev: So that's what, I guess I'm trying to figure out like whether a dashboard would be helpful if it gave you a better, just quick snapshot of the things that right now, you know, you're still very good at fat and fast at, because you've been doing a long time, but like you scroll through inventory to look for, it sounds like aging inventory.
[03:27.6 - 03:28.4] Client: Yeah.
[03:28.4 - 03:39.4] Client: Like, like I can't like, like the only way I can find out how many candies I have right now is by using your list generator, selecting for candies and then selecting the column.
[03:40.7 - 03:49.2] Client: And then I can't even tell like how many I have in each price category, unless I use that feature you gave me, but then it's a little complicated because there's so many price categories. So it's not just like five to 700 or something.
[03:52.2 - 03:53.9] Dev: Okay, cool. That's helpful.
[03:54.2 - 04:00.0] Dev: Um, some of this will probably be in the MVP. Some of it might not be, but, um, yeah, this is great. Okay.
[04:00.0 - 04:09.5] Dev: So, um, you want inventory snapshot, like you just discussed, you want who you owe money to or like, yeah. Who needs to get paid or do you need to know that?
[04:12.4 - 04:15.6] Dev: Or is that something that you would be comfy with?
[04:16.2 - 04:27.8] Client: On dashboard, on dashboard, I go to dashboard and I can see payables, due payables, scheduled office owned total units on hand.
[04:28.4 - 04:50.4] Client: And it'd be cool to see like depths, indoor, out, smalls, um, candy ends in various price brackets, you know, kind of like, that'd be cool. You know, depths from one to 200, from two to 300, from three to four, you know, just like some basic flower categories that we could create. That would be, that'd be cool.
[04:50.7 - 04:55.8] Dev: Okay. And then, you know, like how much money's on hand, you know, that kind of stuff.
[04:56.7 - 05:02.1] Client: And aging, uh, inventory. Does that feel like, okay, got it.
[05:02.4 - 05:14.7] Client: Um, how do you deal with... highlight of like a window of like the five, 10 oldest things, you know, kind of like focus on me.
[05:15.1 - 05:15.5] Dev: Great.
[05:16.7 - 05:34.8] Dev: In terms of your schedule, I imagine that like before you cop in the car, whatever you just like, look at the, um, the calendar, your calendar, um, does that feel like an important thing to have quick access to, Client: I don't think so.
[05:34.8 - 05:46.9] Client: I mean, I think it's just mostly, I think that's a later version thing. I think that's, it's just so easy to open my phone and confirm everyone and drag an appointment around or make it bigger or smaller. All with the touch of a finger. Yeah.
[05:47.2 - 05:49.1] Dev: Okay. Great. Yeah.
[05:50.4 - 06:10.6] Dev: Um, all right. So this is a new concept that you probably, I mean, yeah, I'm not sure how much you'll need it, but you might want to be able to quickly just click into your clients and, you know, sort by certain things, like see who has the highest debt or who has the most orders or things like that. And this is separate from like the leaderboard stuff.
[06:10.6 - 06:28.9] Dev: But I'm curious when you look at, um, just an overview page like that, like are there specific columns that would just be like contact doesn't seem like an important column to have it at all. Are there certain things that you would just love to be able to just like quickly just like sort by.
[06:29.0 - 06:42.8] Client: Yeah. That's a great, that's a great question. Um, I think it would be useful to know how often, um, you could kinda, you know, like who we haven't seen in a while, who do I need to reach out to? Nice.
[06:42.8 - 07:01.3] Client: You know, so that, that'd be valuable. Um, um, maybe who's, um, they're kind of overdue for an order or overdue for a drop, you know, I should reach out to them kind of thing. That would be really good.
[07:01.9 - 07:09.8] Dev: And does it feel important to be able to star certain clients? So they're like always at the top or something like, um,
[07:10.5 - 07:26.6] Client: you know, it seems like, yeah, I mean, I'm going to be able to click in, I'm assuming I can click on this and see their last order and what it was, or I can organize by when they were last there so I can see their recent order or something. Great.
[07:27.4 - 07:31.3] Client: Um, I'm just guessing, I'm just guessing what is the purpose of this sheet?
[07:31.8 - 07:36.2] Dev: Well, I mean, the real purpose of the sheet is also just to be able to like, this is where you come to add clients.
[07:36.9 - 07:37.3] Client: Okay.
[07:37.4 - 07:48.4] Dev: Um, it's a pretty simple process. Um, and we just, we need one place basically where it's just like, we don't need address information.
[07:48.4 - 07:58.7] Dev: Oh yeah, I know. Um, all that stuff also, like most of that stuff is on a feature flag. So, um, we just click it and it does like we turn off the flag and it disappears.
[07:59.4 - 08:00.6] Client: Okay, cool. Yeah. Love it.
[08:02.7 - 08:04.7] Client: I just like, I don't know any of my clients emails.
[08:05.6 - 08:07.4] Dev: Yeah. Nor should you need to. Um,
[08:09.9 - 08:16.6] Client: in terms of maybe I need their login names, is this where their login names would be so they can log into the backend? Dev: Yeah, exactly. Mm hmm.
[08:17.2 - 08:36.6] Dev: Um, do you, in terms of adding clients, there's not, you know, you're not going to need to put any of this contact information, um, other than certain things like, yeah, payment terms.
[08:36.6 - 08:43.0] Dev: This will also be the area that, um, initial like credit settings go or things like that.
[08:43.8 - 09:04.0] Dev: Are you able to, or do you create client? I guess you don't really have this concept. I'm trying to figure out when you're going to create a client because you need to be able, like a client, either like a buyer or a vendor, there's a concept that like, you're going to need to add them as an entity before you transfer...act with them.
[09:04.0 - 09:21.6] Client: Okay. Um, does that, I don't want it to be overburdened some, but it's just kind of a reality of like a, of a system like... we rarely add plants. So it's going to happen like four times a year, you know? Yeah. Okay. Yeah.
[09:26.3 - 09:40.6] Client: Yeah. And if someone's coming in once, we can just put it on somebody else's tab, you know, like if I see Bob every week and Bob brings his buddy Tony one time, then yeah, yeah. Right. Right. You can just go on Bob's tab. Okay.
[09:42.0 - 09:55.0] Dev: Um, this is something that's gotten, uh, improved a fair amount. Um,
[09:57.0 - 10:04.6] Dev: because you, I think gave some specific feedback last time that it was pretty, easy to take action on. Um,
[10:06.7 - 10:10.8] Dev: do these tabs look interesting to you?
[10:12.8 - 10:23.4] Client: Um, master score is like a combination of how quickly they're turning over their debt and how, how, I don't know, I'm assuming it's some combination of things.
[10:23.5 - 10:32.4] Dev: Exactly. Which, which is also like kind of like a recipe or formula thing that we can control. Client: I love it. I figured. Yeah. Okay. Um,
[10:32.4 - 10:41.4] Client: so a dual, I love it. I love it. It's dual is basically a supplier and a, and a yep. A buyer, um,
[10:41.5 - 10:53.5] Client: percentile, uh, trend is up or down, up or down. And then, uh, uh, I'm assuming we can see like the quality of their debt somehow.
[10:53.5 - 10:54.3] Dev: Okay.
[10:57.0 - 11:08.7] Dev: Yeah. So, um, I'll make this so it's more visible in terms of like how it works, but right now, yeah. So this, the financial ranking rankings, um,
[11:09.2 - 11:17.8] Dev: weight revenue, lifetime value margins. Uh, and I believe it does have a debt turnover, but
[11:18.6 - 11:27.5] Client: yeah, I was mostly, I was also really excited about, you said you were gonna have some kind of tool that would like warn us when clients debts are going bad and to stop loaning the money kind of thing.
[11:27.5 - 11:29.5] Dev: Oh yeah. Yeah. Um,
[11:33.3 - 11:44.5] Client: because you know, like that could be, um, there could be even far less options on that sheet, you know, on the, um, on the, it has, it has a lot of information. Like,
[11:46.0 - 11:53.3] Client: I love, I love it, but we'll almost need like a, like what's reliability, like how often they show up or this is their payment behavior actually.
[11:53.4 - 11:56.3] Dev: So this is the, how quickly they repaid debts.
[11:56.8 - 12:07.4] Client: But combining that with financial sounds like that is the most important, like that actually is more important. Um,
[12:09.0 - 12:12.6] Client: trend is kind of growth, right? Dev: Yeah, exactly. Um,
[12:12.8 - 12:24.7] Dev: well trend is their ranking. Like if they're doing better or worse, basically. Um, growth is like actually how much they're spending with you is growing. So it's kind of like, um, velocity.
[12:30.4 - 12:34.7] Client: Got it. Yeah. We'll need a little explanation on these.
[12:34.8 - 12:49.8] Client: And then, um, uh, yeah, I mean maybe we can just combine them into, into less things, um, but not, not very important as long as I, I don't grasp it now, but I, I'm sure I will grasp it eventually.
[12:50.6 - 12:54.8] Dev: Yeah. Um, engagement and what's engagement again?
[12:57.0 - 13:10.6] Dev: Um, this one is frequency and recency. Oh, it says it right there. Order frequency and recency. Client: Okay. So like how, how engaged are they? How often are they coming? Dev: Exactly. Client: Okay, cool. Um,
[13:12.4 - 13:18.6] Dev: and you can see up here this one and then his master score, a combination of financial engagement, reliability and growth. Yeah.
[13:18.6 - 13:26.8] Dev: So the thing that you see up here at the top, which is these customized weights, yeah. Um, this contributes to the master score basically.
[13:26.9 - 13:45.5] Dev: So how much revenue they've done on time payments, how quickly, how much they're ordering, what your margin is, how much of their credit they're using, um, year over year growth. So we could change that to a different sort of growth and then days since last order. Like,
[13:46.2 - 13:52.5] Client: nice. That's cool. I love that. And so a master score is just a combination of all of them. Yeah.
[13:52.5 - 14:06.3] Dev: I mean you can rank them or weight them differently. Um, these are, yeah. Also things that I think we'll customize further, but I want to make sure that we're at least sparking up the right tree. Um,
[14:07.6 - 14:15.3] Client: okay. There's like two other things that I want. I can work for me.
[14:18.6 - 14:24.2] Dev: Well, here's Momo's photography module. Yep. Um,
[14:27.5 - 14:35.4] Dev: invoices in ARAP. Um, this has gotten a lot more accurate since we last spoke.
[14:36.1 - 14:48.1] Client: What is ARAP again? Dev: Um, accounts receivable and accounts payable. Client: Okay. Um, so this is like your payment office. Dev: Like this is going to be their command center basically.
[14:49.5 - 15:15.8] Dev: So with that in mind, I guess thinking about what somebody who's working in your accounting divisions, um, dashboard or just like command center would look like, I imagine, you know, this sort of stuff is interesting for you, but really what they're going to want is just like this, which is basically just like, here are all the actions I can receive a payment. I can pay somebody journal entries, um, expenses.
[15:21.2 - 15:26.8] Client: She never, Oh, I guess if I give her a bag of money, that's receiving the payment. Okay.
[15:28.1 - 15:35.3] Client: Like for Z, I just, I just occasionally give her a big chunk and then she just writes down how much is coming out of that chunk.
[15:36.2 - 15:46.3] Dev: Does she not ever, she doesn't receive payments from, okay. You do. And then she comes and picks them up. Cool.
[15:46.4 - 15:54.6] Dev: So this is going to be important for you actually, cause this is just, just a really quick way of you being able to,
[15:55.4 - 16:00.1] Client: she only needs like low risk farmers. I feel like receiving payments is a little bit higher risk.
[16:00.6 - 16:03.4] Dev: Yep. That makes sense. Okay. That's good to know.
[16:07.4 - 16:09.7] Dev: Um, okay.
[16:18.6 - 16:28.3] Client: yeah, there's a bunch of other stuff that's much smaller, but I think that honestly, like my question about the dashboards and what we just talked about was probably the most important one. Okay.
[16:28.6 - 16:47.0] Client: I'm pretty disappointed that this isn't working yet, but, um, I feel pretty close on it. Honestly, like once, once all the inventory that I know is in the system is listed here, it kind of unblocks everything else. This is like kind of, I would say the final thing to get us to, um,
[16:47.2 - 16:49.6] Client: spreadsheet view. I assume isn't working yet.
[16:50.8 - 17:05.4] Dev: Not yet. It's coming. It really is. Um, though I haven't worked on that since our last time, because I've been focused on getting inventory to work, which is a whole bunch of backend shit. Um, yeah.
[17:05.8 - 17:17.6] Client: So sounds good, buddy. Well, I really appreciate your, your efforts. And I love being engaged with this project. So whenever there's anything or any reason you want, just let me know. Okay,
[17:17.8 - 17:22.8] Dev: cool. Um, you, uh, going to a comic to stand up tonight?
[17:24.8 - 17:45.2] Client: I was going to, but event bright blocked my account because I apparently tried to log in or buy too many tickets or something. I don't know. I don't have tickets. Dev: Well, uh, I can't, I contacted their customer support, so I got, I got nothing weird. Well, I hope that one way or another you get some laughs.
[17:45.7 - 17:57.9] Dev: And then when do you leave tomorrow? Client: Uh, Saturday morning. Dev: Cool. Client: But I love to talk while on vacation. Dev: So great. I can't wait to hear about all the worms, all the worms.
[17:59.0 - 18:06.9] Client: All right. Love you, bud. Thank you. Talk to you soon. Bye. Dev: Okay.
```

### Appendix B: Visual Context Notes from Video Frames

#### Frame 1 (0:00) — Inventory Page
The TERP application is showing the Inventory page. The left sidebar navigation is visible with sections: SALES (Dashboard, Inbox, Clients, Orders, Interest List, Sales Sheets, Live Shopping, Leaderboard, Client Needs, Matchmaking, Quotes, Returns), INVENTORY (Pick & Pack, Products, Inventory [selected], Photography, Samples, Purchase Orders, Vendors, Vendor Supply, Spreadsheet View, Direct Intake). The main content area shows "Inventory — Manage batches and stock levels" with a search bar and filters (All Statuses, All Categories). It displays Batches: 0, Live: 0, Value: $0.00 with a loading spinner visible — inventory is not loading. The user is signed in as "TERP Operator."

#### Frame 4 (3:00) — Dashboard Page
The Dashboard is selected in the sidebar. It shows "Overview of your business metrics and activity." The Cash Flow section displays Cash Collected: $5,828,886.76 and Cash Spent: $0.00. The Sales section shows client rankings with Total Sales: Bay Distribution ($322,283), Green Cannabis Co ($386,406), Santa Rosa Reserve ($267,967), Los Angeles Therapeutics ($249,913), Golden Health ($215,193), and more. "Customize" and "Comments" buttons are visible.

#### Frame 7 (6:00) — Clients Page
The Clients page shows a client list with the header "Manage clients, track transactions, and monitor debt." Stats show Total: 101, With Debt: 0, LTV: $0.00. Columns visible are Name, Type, Contact, LTV, Debt, and Orders. The list shows a mix of "Buyer" and "Supplier" types with contact emails visible for each client. An "Add Client" button is in the top right.

#### Frame 10 (9:00) — Create Sales Order Page (ERROR STATE)
The Orders > Create page is visible, showing "Create Sales Order — Build order with COGS visibility and margin management." Customer selected is Riverside Naturals. A large error is displayed: "Failed to load inventory" with a SQL error. A "No Credit Limit Set" warning is shown. Order Totals show $0.00 and "Order has validation errors" message appears. This is a known bug — inventory failing to load.

#### Frame 11 (10:00) — Leaderboard Page
The Leaderboard page shows client performance metrics with the header "Track and compare client performance across key metrics." Tabs are visible: Master Score, Financial, Engagement, Reliability, Growth. A "Customize Weights" button is visible. The Master Score Rankings table shows: 1st Green Cannabis Co (DUAL) — 69.5 — Top 99%, 2nd Glendale Cannabis Co (CUSTOMER) — 66.3 — Top 98%, 3rd Emerald Naturals (CUSTOMER) — 64.2 — Top 97%. The FINANCE section is visible in the sidebar (Invoices, AR/AP, Credit Settings, Credits, Reports, Pricing Rules) along with the ADMIN section (Users, System Settings, Calendar, Todo Lists, Scheduling, Time Clock, Feature Flags, Workflow Queue, Locations).

#### Frame 14 (13:00) — Leaderboard Customize Weights Modal
A modal shows "Customize Weights" for Master Score calculation with sliders: YTD Revenue 25% ("Year-to-date revenue contribution"), On-Time Payment 20% ("Payment reliability"), Order Frequency 15% ("Orders per period"), Profit Margin 15% ("Profitability percentage"), Credit Utilization 10% ("Credit line usage"), YoY Growth 10% ("Year-over-year growth rate"), Recency 5% ("Days since last order"). Total: 100%. "Reset to Defaults" and "Save Weights" buttons are visible. The background shows the Engagement Rankings tab.

#### Frame 15 (14:00) — AR/AP Accounting Dashboard
The AR/AP page is selected in the FINANCE section showing "Accounting Dashboard — Overview of your financial health and key metrics." Key metrics: Cash Balance $0.00, Accounts Receivable $2,492,412.54, Accounts Payable $1,753,971.17, Net Position $738,441.37 (AR minus AP). AR Aging breakdown: Current $1,005,720, 30 Days $559,758, 60 Days $476,819, 90 Days, 90+ Days. AP Aging breakdown: Current $957,646, 30 Days $933,612, 60 Days $758,620, 90 Days $291,125, 90+ Days. Top Debtors section shows "No outstanding balances." Top Vendors Owed shows "Unknown Vendor" entries with amounts ($258,649.91, $186,313.16, etc.). Bottom tabs: Overdue Invoices (96), Overdue Bills (44). "Configure Display" button visible.

#### Frame 16 (15:00) — AR/AP Quick Actions and Invoices
The AR/AP page scrolled down shows Overdue Invoices (96) and Overdue Bills (44) tabs. The overdue invoices table displays: INV-20251123-00098 (West Coast Wellness Center, 12/07/2025, 52 days, $21,480.75), INV-20251124-00204 (Valley Cannabis Co, 12/08/2025, 51 days, $19,524.54), INV-20251125-00275 (Redwood Collective, 12/09/2025, 50 days, $14,700.10), INV-20251125-00374 (Los Angeles Therapeutics, 12/09/2025, 50 days, $180,052.48), INV-20251126-00190 (West Coast Apothecary, 12/10/2025, 49 days, $18,152.81). A "View All 96 Overdue Invoices" link is shown. The Quick Actions section has buttons: Receive Payment (green), Pay Vendor (green), Post Journal Entry, Create Invoice, Create Bill, Record Expense. Recent Invoices, Recent Bills, and Recent Payments sections are visible with various statuses (Paid, Viewed, Void, Pending, Received).

### Appendix C: Complete List of 64 Analyzed Details

### Appendix C: Complete List of 64 Analyzed Details

This appendix contains the full, unabridged list of 64 details, nuances, and implied contexts that were cataloged during the line-by-line re-analysis of the interview. This serves as a reference for the main body of the report.

#### Relationship & Emotional Context (1-7)

1.  **The relationship is deeply personal.** They end with "Love you, bud" [18:03.2]. This is not a vendor-client relationship — it's friends/family building a product together.
2.  **The customer is patient but disappointed.** "I'm pretty disappointed that this isn't working yet" [16:28.6] — but immediately follows with encouragement. This emotional dynamic is critical context.
3.  **The customer offered to wait.** The very first words: "days or a week, like, I don't mind, um, uh, waiting buddy. Like, like there's no point in spinning your wheels if you need a couple more hours or whatever." [00:00.0] — The customer is proactively managing the developer's stress.
4.  **The developer has imposter syndrome concerns.** "I've kind of validated that I'm not just being a total dummy about some of this stuff." [00:35.8] — The developer is seeking validation, not just feedback.
5.  **The developer feels the customer's patience.** "I feel your patience and, uh, I'm feeling it." [00:29.9] — There's emotional weight here. The developer knows they're behind.
6.  **The customer is genuinely enthusiastic.** Multiple "I love it" moments: [10:28.0], [10:32.4], [11:46.0], [13:46.2]. This isn't polite agreement — this is real excitement about the leaderboard concept.
7.  **The customer wants to stay engaged.** "I love being engaged with this project. So whenever there's anything or any reason you want, just let me know." [17:09.6] AND "But I love to talk while on vacation." [17:51.4] — They want MORE communication, not less.

#### Stakeholder "Tigger" (8-10)

8.  **Tigger is a real person who matters.** The developer offers to bring Tigger into the call: "I can have Tigger over or we can do a three way signal call?" [01:08.2]
9.  **Tigger has already been shown the product prematurely.** "I don't want to freak Tigger out with a half done thing. Like I already did once." [01:30.1] — This is a CRITICAL detail. It means Tigger is a stakeholder who had a negative reaction to seeing the product in an incomplete state, creating implicit pressure to get to a presentable MVP state.
10. **They communicate via Signal.** "can you do a three way signal call?" [01:12.7] and "I've done four way signal video calls before" [01:21.6] — Signal is their communication platform, consistent with industry privacy concerns.

#### The "List Generator" Workaround (11-12)

11. **The customer has a current workaround for inventory analysis.** "the only way I can find out how many candies I have right now is by using your list generator, selecting for candies and then selecting the column." [03:28.4] — This reveals an existing, clunky, multi-step feature is being used for analysis.
12. **The price category problem is specific.** "I can't even tell like how many I have in each price category, unless I use that feature you gave me, but then it's a little complicated because there's so many price categories." [03:40.7] — The customer wants SIMPLIFIED brackets, not the current granular ones.

#### The Developer's Framing and Redirects (13-16)

13. **The developer reframes inventory scrolling as a dashboard need.** "So inventory right now is kind of your like homepage because of all the things that you just mentioned. Right." [02:26.1] — The developer is actively guiding the customer toward the dashboard concept.
14. **The developer identifies that "low stock" is a different feature.** "what I hear low on patch feature is not actually in inventory that might be in needs or something" [03:00.7] — The developer recognizes that "what am I low on" is a separate concept from inventory browsing.
15. **The developer acknowledges the customer's expertise.** "you're still very good at fat and fast at, because you've been doing a long time" [03:19.7] — The developer recognizes the customer has deep domain expertise.
16. **The developer explicitly says some things won't make MVP.** "some of this will probably be in the MVP. Some of it might not be" [03:54.2] — This sets expectations.

#### The "Nomenclature" Problem (17-19)

17. **The developer is struggling with terminology.** "some of the like nomenclature stuff, like I'm still kind of trying to figure out." [01:00.0] — The developer doesn't fully understand the industry terminology.
18. **The customer doesn't know what AR/AP means.** "What is ARAP again?" [14:36.1] — The UI should use business language, not accounting jargon.
19. **The customer immediately reframes AR/AP in their own terms.** "so this is like your payment office" [14:41.2] — The customer's mental model is a "payment office," a direct UX naming suggestion.

#### The Leaderboard Deep Dive (20-35)

20. **Previous feedback was acted on.** "this is something that's gotten, uh, improved a fair amount... because you, I think gave some specific feedback last time that it was pretty easy to take action on." [09:48.4] — The leaderboard improvements are a direct result of a prior feedback session.
21. **The customer's first instinct about Master Score is debt-focused.** "master score is like a combination of how quickly they're turning over their debt" [10:12.8] — The customer's primary association with "score" is debt behavior.
22. **The customer reads the leaderboard columns aloud.** "percentile, uh, trend is up or down" [10:41.5] — The column headers alone aren't self-explanatory.
23. **"Quality of debt" is a concept the customer cares about deeply.** "I'm assuming we can see like the quality of their debt somehow." [10:49.3] — They want to know how GOOD the debt is, not just how much.
24. **The developer promises to improve visibility.** "I'll make this so it's more visible in terms of like how it works" [11:00.2] — The developer acknowledges the current presentation isn't clear.
25. **The financial rankings include specific metrics.** "weight revenue, lifetime value margins. Uh, and I believe it does have a debt turnover" [11:09.2] — The developer lists the financial sub-metrics but isn't 100% sure about debt turnover.
26. **The debt warning was a PREVIOUS PROMISE.** "you said you were gonna have some kind of tool" [11:21.4] — This is a follow-up on an unfulfilled promise.
27. **The customer wants FEWER options on the leaderboard.** "there could be even far less options on that sheet" [11:35.6] — They explicitly want simplification.
28. **The customer confuses reliability with attendance.** "what's reliability, like how often they show up" [11:46.0] — The label "Reliability" is misleading.
29. **Financial + Reliability is THE most important combination.** "combining that with financial sounds like that is the most important" [11:56.8] — The customer explicitly ranks this combination.
30. **Trend vs Growth confusion.** The customer asks "trend is kind of growth, right?" [12:09.0] and the developer explains they're different. These two concepts are too similar and confusing.
31. **The customer trusts they'll learn.** "I don't grasp it now, but I, I'm sure I will grasp it eventually." [12:46.4] — The customer is giving grace, but this signals the current presentation is too complex.
32. **The customer forgot what Engagement means.** "engagement and what's engagement again?" [12:53.0] — The label isn't working.
33. **The developer walks through ALL weight components.** Revenue, on-time payments, ordering, margin, credit usage, YoY growth, days since last order [13:26.9].
34. **The developer offers to change growth type.** "we could change that to a different sort of growth" [13:41.6] — This implies multiple growth calculation options.
35. **The developer wants validation on direction.** "I want to make sure that we're at least sparking up the right tree" [14:01.9] — Seeking directional validation.

#### The "Two Other Things" (36)

36. **The customer mentions wanting "two other things" but they get cut off.** "okay. There's like two other things that I want." [14:07.6] — This is an unresolved conversational thread.

#### Photography Module (37)

37. **"Momo's photography module" exists.** "Well, here's Momo's photography module." [14:18.6] — "Momo" is a person. The customer's lack of reaction suggests this is not a priority.

#### AR/AP Deep Dive (38-44)

38. **AR/AP has improved.** "this has gotten a lot more accurate since we last spoke." [14:31.2] — Another reference to iterative improvement.
39. **The developer frames AR/AP as the accounting person's command center.** "this is going to be their command center basically." [14:45.7] — Distinguishing between owner and accountant views.
40. **The developer distinguishes between what interests the owner vs the accountant.** "this sort of stuff is interesting for you, but really what they're going to want is just like this" [15:05.6] — Thinking about role-based views.
41. **The customer has a moment of realization about "Receive Payment."** "She never, Oh, I guess if I give her a bag of money, that's receiving the payment." [15:21.2] — The customer is working through the accounting concept in real time.
42. **The cash handling workflow is specific.** Owner gives accountant a lump sum of cash, accountant tracks disbursements [15:28.1].
43. **The developer clarifies the payment flow.** Clients pay the OWNER, who collects cash; the accountant picks up the cash and pays vendors [15:36.2].
44. **"Low risk farmers" is a specific term.** The customer uses "farmers" to mean vendors/suppliers [15:55.4].

#### The Closing Section (45-48)

45. **"Bunch of other stuff" is explicitly deprioritized.** "there's a bunch of other stuff that's much smaller" [16:18.6] — The customer considers other items less important than the dashboard.
46. **Inventory is the critical path blocker.** "once all the inventory that I know is in the system is listed here, it kind of unblocks everything else" [16:32.6] — The customer sees inventory as THE blocker.
47. **The customer asks about Spreadsheet View unprompted.** "spreadsheet view. I assume isn't working yet." [16:47.2] — Proactively checking on a feature they care about.
48. **The developer is transparent about priorities.** "I haven't worked on that since our last time, because I've been focused on getting inventory to work" [16:55.2] — Honest about where time went.

#### Personal Details (49-52)

49. **They're going to a comedy standup show.** [17:17.8] — Reinforcing the personal relationship.
50. **The customer got blocked by Eventbrite.** [17:25.7] — Casual, friendly conversation.
51. **The customer is going on vacation.** [17:45.7] — Leaving the next day.
52. **"All the worms" is an inside joke.** [17:54.4] — A reference they both understand.

#### Implied Business Context (53-64)

53. **This is a cannabis distribution business.** Categories (deps, indoor, outdoor, smalls, candy ends) are cannabis product types.
54. **The business operates on credit/debt.** Debt quality and payment behavior are critical.
55. **Cash is king in this industry.** Focus on "cash on hand," "bag of money," and specific cash handling workflows.
56. **The customer has ~101 clients.** Visible in Frame 7.
57. **The business has significant receivables.** $2,492,412.54 in AR visible in Frame 15.
58. **The business has significant payables.** $1,753,971.17 in AP visible in Frame 15.
59. **There are 96 overdue invoices.** Visible in Frame 16.
60. **There are 44 overdue bills.** Visible in Frame 16.
61. **The customer rarely adds new clients.** "we rarely add plants. So it's going to happen like four times a year" [09:14.4] — "plants" likely means "clients."
62. **One-time visitors go on existing tabs.** "if someone's coming in once, we can just put it on somebody else's tab" [09:27.9] — A specific business practice.
63. **The customer's daily workflow starts with inventory.** The new homepage should replace this ritual.
64. **"Before you cop in the car" = before you get in the car.** [05:16.7] — Implying the customer is mobile as part of their daily work.

### Appendix D: Implementation Status Cross-Reference

This appendix provides the detailed cross-reference of all 32 items mentioned in the meeting against the existing TERP codebase and documentation. It was used to filter the initial list down to the 15 genuinely new or enhancement-worthy items.

#### Summary

| Status | Count | Description |
|---|---|---|
| **Already Implemented** | 11 | Items that exist in the codebase. |
| **Already Spec'd** | 8 | Items with existing specifications. |
| **Known Bug (In Progress)** | 3 | Inventory-related bugs already being worked on. |
| **Genuinely New** | 10 | Items requiring new work. |

#### Items Removed (Already Exist or Obvious)

| Meeting ID | Title | Evidence | Action |
|---|---|---|---|
| MEET-001 | Inventory page fails to load | **KNOWN BUG** - Already tracked as BUG-040 in roadmap | REMOVE - Obvious |
| MEET-003 | Spreadsheet View not functional | **IN PROGRESS** - SpreadsheetViewPage.tsx exists, behind feature flag | REMOVE - Obvious |
| MEET-005 | Aging inventory highlight | **IMPLEMENTED** - AgingInventoryWidget.tsx exists | REMOVE |
| MEET-017 | Master Score is customizable | **IMPLEMENTED** - WeightCustomizer.tsx component exists | REMOVE |
| MEET-022 | Engagement = Frequency + Recency | **IMPLEMENTED** - LeaderboardPage.tsx shows ENGAGEMENT category | REMOVE |
| MEET-023 | Master Score weight components | **IMPLEMENTED** - WeightCustomizer allows customizing all components | REMOVE |
| MEET-028 | Inventory functionality unblocks all | **KNOWN** - Documented in UNIFIED_STRATEGIC_ROADMAP | REMOVE - Obvious |
| MEET-032 | Create Sales Order fails | **KNOWN BUG** - Downstream of BUG-040 | REMOVE - Obvious |
| MEET-009 | Client last seen / overdue tracking | **IMPLEMENTED** - PurchasePatternsWidget.tsx & MatchmakingOpportunitiesWidget cover this | PARTIAL |
| MEET-014 | Minimal client creation fields | **IMPLEMENTED** - QuickCreateClient.tsx (WS-011) allows name-only creation | REMOVE |
| MEET-011 | Hide unnecessary contact fields | **IMPLEMENTED** - QuickCreateClient shows only name, email/phone | REMOVE |
| MEET-024 | AR/AP is accounting command center | **SPEC'D** - WS-001-SPEC.md & WS-002-SPEC.md cover this | REMOVE |
| MEET-010 | View client's last order from list | **SPEC'D** - FEAT-009-CLIENT-LEDGER-SPEC.md covers this | REMOVE |
| MEET-018 | Dual = Supplier + Buyer | **IMPLEMENTED** - CLIENT_TYPE_OPTIONS in LeaderboardPage.tsx shows "Dual (Both)" | REMOVE |
| MEET-019 | Financial + Reliability most important | **IMPLEMENTED** - Metric categories in LeaderboardPage show these prominently | REMOVE |

#### Items Kept (Genuinely New or Need Enhancement)

| Meeting ID | Title | Priority | Notes |
|---|---|---|---|
| MEET-002 | Dashboard inventory snapshot by category | Now | InventorySnapshotWidget exists but needs category/price bracket breakdown. |
| MEET-004 | Dashboard payables summary | Now | Need to verify if TotalDebtWidget covers this. |
| MEET-006 | Cash on hand display | Next | AvailableCashWidget may exist - verify. |
| MEET-008 | Debt warning system for at-risk clients | Now | **NEW** - No existing spec found. |
| MEET-013 | Store client login names | Next | **NEW** - No existing field. |
| MEET-020 | Add metric explanations to leaderboard | Next | **NEW** - Tooltips/help text needed. |
| MEET-021 | Consider consolidating metrics | Later | **NEW** - UX simplification. |
| MEET-029 | Set Inventory as default landing page | Next | **NEW** - User preference. |
| MEET-031 | Simplify price category filtering | Next | **NEW** - UX improvement. |
| MEET-007 | Calendar integration deprioritized | Later | Customer confirmed - document in roadmap. |

---

*End of document.*
