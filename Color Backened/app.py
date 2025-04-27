from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import io
import base64

app = Flask(__name__)
CORS(app)

@app.route('/detect-color', methods=['POST'])
def detect_color():
    try:
        data = request.get_json()

        if not all(k in data for k in ('image', 'x', 'y')):
            return jsonify({'error': 'Missing required parameters'}), 400

        image_base64 = data['image']

        # Strip prefix if present
        if "," in image_base64:
            image_base64 = image_base64.split(",")[1]

        # Decode the base64 image
        image_data = base64.b64decode(image_base64)
        image = Image.open(io.BytesIO(image_data)).convert('RGB')

        width, height = image.size

        x = int(float(data['x']))
        y = int(float(data['y']))

        # Ensure coordinates are within image bounds
        x = max(0, min(width - 1, x))
        y = max(0, min(height - 1, y))

        r, g, b = image.getpixel((x, y))

        return jsonify({'r': r, 'g': g, 'b': b})

    except Exception as e:
        print("Error:", e)
        return jsonify({'error': 'Failed to process image'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5050, debug=True)
