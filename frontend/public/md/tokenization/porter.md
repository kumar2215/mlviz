# Porter stemming: group related forms

After splitting text into words, a stemmer can reduce related forms to a shared stem. The original **Porter stemmer** applies ordered English suffix rules: `caresses` becomes `caress`, and `ponies` becomes `poni`. A stem need not be a dictionary word; its purpose is to group forms for comparison.

Stemming changes a word that has already been found. It does not decide where the word begins or ends. Watch which rule steps change each example, then predict a few stems yourself. [Porter algorithm reference](https://tartarus.org/martin/PorterStemmer/index.html)
