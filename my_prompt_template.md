# Artifact Prompt Template 
My Artifact Prompt Template 
## Initial Prompt
<system_role>
<!-- 
DO: Give a clear expert role (e.g. "senior React engineer") so the model uses the right kind of knowledge.
DON'T: Don't just say "you are a helpful assistant" – that can make the model try too hard to please and hallucinate.
-->
You are a senior [insert role], focused on [insert focus, e.g.: code robustness, passing tests]. Your goal is to deliver an Artifact that runs without errors.

</system_role>

<context>
<!-- 
DO: Explain the "why" behind the task and who it's for – that helps the model generalize better.
DO: If you have a reference style, add a screenshot description or doc link.
-->
[Brief background here: What kind of app do I want? Who is it for? What problem does it solve?]
Reference style: [Optional: describe the UI style you want or add a link]

</context>

<task>
<!-- 
DO: Start with an MVP (minimum viable product), don't try to do everything at once.
DON'T: Don't use vague verbs (e.g. "handle data") – use specific ones (e.g. "clean and visualize data").
-->
Please build an interactive [Web Artifact / React app].
Core features:
1. [Feature 1]
2. [Feature 2]

</task>

<constraints>
<!-- 
DO: Say clearly what NOT to do (e.g. no backend API) – that really helps avoid hallucination.
DO: Prefer positive instructions with a concrete format (e.g. use YAML not JSON), since models follow "do this" better.
-->
Rules to follow:
- Tech stack: React + Tailwind CSS (frontend only).
- Don't: No external APIs, no TODO placeholders left in the code.
- Output format: Wrap the code in Artifact tags.

</constraints>

<verification_plan>
<!-- 
DO: Design test cases externally first, each covering a different aspect. Put them in the initial prompt so the model builds toward them.
DO: After the first artifact is done, use a follow-up prompt to add a test group that covers every point in test-doc.md – don't try to list all of that in the initial prompt.
DON'T: Don't assume the code will work on the first try – make the model think about how to verify it.
-->
Initial prompt:

List the test cases you designed (by aspect). The artifact should include a debug panel or test UI that can run these:
1. [Aspect / test case 1]
2. [Aspect / test case 2]

</verification_plan>

<chain_of_thought>
<!-- 
DO: Make the model write a "plan" or "PRD" before coding so it doesn't go down wrong paths.
DO: Use XML tags around the thinking so it's separate from the final code.
-->
Before writing code, plan step by step inside <thinking> tags:
1. Analyze the user flow.
2. Design component structure and state.
3. Check that all constraints are met.
</chain_of_thought>

Then generate the final code based on that.


## Follow-up prompt (use after I get the first version):

<task>
Add a Testing section that:
1. Reads the test cases from `test-doc.md`
2. Maps each test case to something runnable (e.g. a test button or script)
3. Runs all tests and reports PASS or FAIL for each
</task>

<requirements>
- A "Run All Tests" button. When clicked, run every test from `test-doc.md` and show:
  - test name / id
  - expected behavior
  - what actually happened
  - PASS or FAIL
- A summary at the end: total tests, how many passed, how many failed
</requirements>

<constraints>
- Do NOT change any existing logic, behavior, or structure of the app. No refactors.
- If a test fails, do NOT change the app logic to make it pass – just report the failure.
- Only change the testing code if a test was implemented wrong (e.g. wrong expected value).
</constraints>

<ui>
Put the Testing section and results in a panel so all results are visible without horizontal scrolling. Results should update when tests run.
</ui>