---
title: Splitting Iris flowers
---
# Splitting Iris flowers

First compare **two variables**, then compare **two fixed thresholds for the better variable**. Choose the split with the greater gain at each step. Results are calculated automatically. Gini impurity is **G(S) = 1 − Σₖ pₖ²**, where pₖ is a species' fraction and n counts flowers.

$$
IG=G(P)-\frac{n_L}{n_P}G(L)-\frac{n_R}{n_P}G(R)
$$
