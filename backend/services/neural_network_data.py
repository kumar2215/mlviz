"""Bundled educational language classifier; feature extraction stays on the server."""
import math
import unicodedata
from services.neural_network_math import dot, softmax

ALPHABET = list("abcdefghijklmnopqrstuvwxyzäöüßéèêàç")
LANGUAGES = ["English", "French", "German"]
CORPUS = ['the quick brown fox jumps over the lazy dog. this is a small example of the english language. we are learning how to build a neural network and understand its weights. hello how are you today? the weather is beautiful and the children are playing in the garden. she reads a book while he writes a letter. thank you for your help. we would like some water and bread. learning new things is fun.', "le renard brun saute par dessus le chien. ceci est un petit exemple de la langue française. nous apprenons à construire un réseau et comprendre les poids. bonjour comment allez vous aujourd'hui? il fait beau et les enfants jouent dans le jardin. elle lit un livre pendant qu'il écrit une lettre. merci beaucoup pour votre aide. nous voudrions de l'eau et du pain. apprendre de nouvelles choses est agréable.", 'der schnelle braune fuchs springt über den hund. dies ist ein kleines beispiel der deutschen sprache. wir lernen ein neuronales netz und seine gewichte zu verstehen. guten tag wie geht es ihnen heute? das wetter ist schön und die kinder spielen im garten. sie liest ein buch während er einen brief schreibt. vielen dank für ihre hilfe. wir möchten wasser und brot. neue dinge zu lernen macht spaß.']

def character_features(text):
    text = unicodedata.normalize('NFC', text).lower()
    counts = [text.count(letter) for letter in ALPHABET]
    total = sum(counts)
    return dict(counts=counts, features=[count / total if total else 0 for count in counts], total=total)

def language_model():
    features = [character_features(text) for text in CORPUS]
    return [dict(weights=[[40 * math.log((count + 1) / (item['total'] + len(ALPHABET))) for count in item['counts']] for item in features], biases=[math.log(1 / 3)] * 3, activation='softmax')]
