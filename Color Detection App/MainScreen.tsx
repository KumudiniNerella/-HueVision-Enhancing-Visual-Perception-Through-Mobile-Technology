import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Alert, StyleSheet, ActivityIndicator, Dimensions, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Speech from 'expo-speech';
import axios from 'axios';
import { colorData } from './colors';

const { width: screenWidth } = Dimensions.get('window');

const BACKEND_URL = 'http://192.168.1.160:5050/detect-color';

const MainScreen = () => {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [base64, setBase64] = useState<string>('');
  const [originalSize, setOriginalSize] = useState({ width: 0, height: 0 });
  const [displayedSize, setDisplayedSize] = useState({ width: 0, height: 0 });
  const [detectedColor, setDetectedColor] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [colorHistory, setColorHistory] = useState<string[]>([]);

  const pickImage = async (fromCamera: boolean) => {
    const permissionResult = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      alert('Permission is required!');
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ base64: true })
      : await ImagePicker.launchImageLibraryAsync({ base64: true });

    if (!result.canceled && result.assets?.length > 0) {
      const image = result.assets[0];
      setImageUri(image.uri);
      setBase64(image.base64 || '');
      setOriginalSize({ width: image.width || 0, height: image.height || 0 });
      setDetectedColor('');
      setColorHistory([]); // Reset color history for new image
    }
  };

  const findClosestColor = (r: number, g: number, b: number): string => {
    let minDistance = Infinity;
    let closestColor = 'Color not found';
    for (const color of colorData) {
      const dist = Math.sqrt(
        Math.pow(r - color.r, 2) +
        Math.pow(g - color.g, 2) +
        Math.pow(b - color.b, 2)
      );
      if (dist < minDistance) {
        minDistance = dist;
        closestColor = color.name;
      }
    }
    return closestColor;
  };

  const handleImagePress = async (event: any) => {
    if (!imageUri || !base64 || !originalSize.width || !displayedSize.width) return;

    const { locationX, locationY } = event.nativeEvent;

    const scaleX = originalSize.width / displayedSize.width;
    const scaleY = originalSize.height / displayedSize.height;

    const originalX = locationX * scaleX;
    const originalY = locationY * scaleY;

    try {
      setLoading(true);
      const response = await axios.post(BACKEND_URL, {
        image: `data:image/jpeg;base64,${base64}`,
        x: originalX,
        y: originalY,
      });
      const { r, g, b } = response.data;
      const name = findClosestColor(r, g, b);
      const result = `${name} (RGB: ${r}, ${g}, ${b})`;
      setDetectedColor(result);
      setColorHistory((prevHistory) => [result, ...prevHistory.slice(0, 4)]); // Limit to 5 items
      Speech.speak(name);
    } catch (error) {
      console.log(error);
      Alert.alert('Error', 'Failed to detect color.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>HueVision</Text>

      <TouchableOpacity onPress={() => pickImage(false)} style={styles.button}>
        <Text style={styles.buttonText}>Pick Image from Gallery</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => pickImage(true)} style={styles.button}>
        <Text style={styles.buttonText}>Take a Picture</Text>
      </TouchableOpacity>

      {imageUri && (
        <TouchableOpacity
          activeOpacity={1}
          onPress={handleImagePress}
          style={styles.imageWrapper}
        >
          <Image
            source={{ uri: imageUri }}
            style={styles.image}
            resizeMode="contain"
            onLayout={(event) => {
              const { width, height } = event.nativeEvent.layout;
              setDisplayedSize({ width, height });
            }}
          />
        </TouchableOpacity>
      )}

      {loading && <ActivityIndicator size="large" color="blue" />}

      {detectedColor !== '' && <Text style={styles.result}>Detected: {detectedColor}</Text>}

      {colorHistory.length > 0 && (
        <View style={styles.historyContainer}>
          <Text style={styles.historyTitle}>Color History</Text>
          {colorHistory.map((color, index) => (
            <Text key={index} style={styles.historyItem}>{color}</Text>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#f4f4f4',
    paddingTop: 60,
    paddingBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  button: {
    backgroundColor: '#1e90ff',
    padding: 12,
    borderRadius: 8,
    marginVertical: 10,
    width: '80%',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  imageWrapper: {
    width: screenWidth - 40,
    height: screenWidth - 40,
    marginTop: 20,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  result: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '500',
    color: '#444',
  },
  historyContainer: {
    marginTop: 30,
    paddingHorizontal: 20,
    width: '100%',
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#444',
  },
  historyItem: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
});

export default MainScreen;
