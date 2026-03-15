---
title: Hyperparameters?
---
# Hyperparameters?

Now the difference is that you were able to control **how the tree learns** by adjusting its hyperparameters. Instead of letting the algorithm grow the tree freely, you placed limits on its structure—for example by setting a **maximum depth**.

This affects how complex the tree can become. If the tree is allowed to grow very deep, it may keep splitting the data until it almost perfectly memorizes the training set. While this can give very high **training accuracy**, the model may start capturing noise or very specific patterns that don’t generalize well to new data. This is known as **overfitting**.

By limiting the depth (for example, max_depth = 3), the tree is forced to learn **simpler decision rules**. It may not perfectly classify every training example, but the rules it learns tend to generalize better. This is why you might observe something interesting: the model with a limited depth can sometimes produce **better accuracy on the test set**, even though it performs slightly worse on the training set. In other words, restricting the model’s complexity can help it make better predictions on unseen data. 

Now, create your own set of training questions! No worries, the relevant information will be provided to you.