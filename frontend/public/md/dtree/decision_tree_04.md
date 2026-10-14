---
title: Splitting Iris flowers
---
# Splitting Iris flowers

Change each threshold, **recalculate**, then choose the greater gain. This uses Gini impurity **G(S) = 1 − Σₖ pₖ²**, where pₖ is a species' fraction and n counts flowers.

$$
IG=G(P)-\frac{n_L}{n_P}G(L)-\frac{n_R}{n_P}G(R)
$$
