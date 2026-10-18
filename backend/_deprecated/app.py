import re
from flask import Flask
from flask_cors import CORS
from flasgger import Swagger
from decision_tree import bp as dt_bp

app = Flask(__name__)
app.secret_key = 'dingdong'
CORS(app,
     origins=['http://localhost:5173',
              'http://127.0.0.1:5173'],
     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
     allow_headers=['Content-Type', 'Authorization'],
     supports_credentials=True)

app.config['DEBUG'] = True  # for dev

app.config['SWAGGER'] = {
    'title': 'MLviz',
    'uiversion': 3,
    'description': ('API documentation '
                    'including ML model training and data analysis.'),
    'version': '1.0.0',
    'contact': {
        'name': 'Kumar',
        'url': 'https://github.com/kumar2215',
        'email': 'kumar.kg279@gmail.com'
    },
    'license': {
        'name': 'Apache 2.0',
        'url': 'http://www.apache.org/licenses/LICENSE-2.0.html'
    }
}

Swagger(app)

app.register_blueprint(dt_bp)

if __name__ == '__main__':
    app.run(debug=True,
            port=5000,
            use_reloader=False)
