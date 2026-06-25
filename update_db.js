const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateQuestion() {
  const q = await prisma.question.findFirst({
    where: { title: { contains: 'Explain Controlled Components and Uncontrolled Components' } }
  });

  if (q) {
    console.log("Found question", q.id);
    const newAnswer = `
# Form Handling in React

One of the most common React interview topics is how forms are handled.

## Component Types

In React, form elements such as:
- Input fields
- Textareas
- Checkboxes
- Radio buttons
- Select dropdowns

can be managed in two ways:
1. Controlled Components
2. Uncontrolled Components

## Why This Matters

Understanding the difference is important because almost every real-world application contains forms.

## 1. Controlled Components

In a controlled component, form data is handled by a React component. The alternative is uncontrolled components, where form data is handled by the DOM itself.
`;
    await prisma.question.update({
      where: { id: q.id },
      data: { answer: newAnswer }
    });
    console.log("Updated question successfully.");
  } else {
    console.log("Question not found.");
  }
}

updateQuestion().catch(console.error).finally(() => prisma.$disconnect());
