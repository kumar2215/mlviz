---
title: What just happened?
---
# What just happened?

What just happened is that the algorithm **learned a sequence of questions** from the data that helps it distinguish between the three iris species. Using the training dataset, the decision tree examined the four features—sepal length, sepal width, petal length, and petal width—and searched for splits that best separated the different classes.

Starting from the root node, the algorithm chose a feature and threshold that divided the data into groups that were more “pure” (meaning they contained mostly one species). It then repeated this process for each resulting subset, creating more nodes and branches. This continued until the stopping conditions in the default scikit-learn settings were met.

The final result is a **tree of decision rules**. When you pass a new flower to the model, it simply follows the learned path of questions (for example, checking petal length, then petal width) until it reaches a leaf node, which gives the predicted species. In essence, the model has automatically learned how to play a structured version of 20 Questions for identifying iris flowers.

Now, let's see what hyperparams we can change!