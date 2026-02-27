- A node represents
    - A set of training samples that reached this point

    - A question to ask next (the split)

- A split is defined by
    - Feature: e.g. petal length

    - Rule: e.g. `petal_length < 2.45`

- What “good” means
    - After splitting, each side is “more pure”
        - Mostly one class on the left

        - Mostly one class on the right

- Training loop (high level)
    - Start with all data at the root

    - Try candidate splits

    - Pick the split that improves purity the most

    - Recurse on children until a stopping condition is hit
