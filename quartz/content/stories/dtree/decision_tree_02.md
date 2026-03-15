---
title: How can a decision tree be used?
---
# How can a decision tree be used?

This idea becomes useful when we apply it to real data. Instead of guessing objects, the questions are about features in the data. For example, imagine a bank trying to decide whether to approve a loan. The model might start with a question like *“Is the applicant’s income above $50,000?”* If yes, it follows one branch; if no, another. The next question might be *“Does the applicant have existing debt?”* or *“Is their credit score above 700?”* Each step narrows down the possibilities until the tree reaches a final decision, such as approving or rejecting the loan.

Because of this structure, decision trees can be used for many practical tasks. They are commonly used for **classification**, like identifying whether an email is spam or not, diagnosing diseases from symptoms, or recognizing objects in data. They can also be used for **prediction**, such as estimating house prices or customer churn. In each case, the model is essentially learning the most informative sequence of questions to ask about the data so that it can arrive at the most accurate answer.