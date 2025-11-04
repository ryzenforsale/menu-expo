'use client'
import React, { useState } from 'react';
import { Upload, Loader2, Camera, Utensils, ChefHat } from 'lucide-react';

export default function MenuAnalyzer() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dishes, setDishes] = useState([]);
  const [error, setError] = useState('');

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setError('');
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setError('Please select a valid image file');
    }
  };

  const analyzeMenu = async () => {
    if (!selectedFile) {
      setError('Please upload a menu image first');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('menu', selectedFile);

      const response = await fetch('/api/analyze-menu', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to analyze menu');
      }

      const data = await response.json();
      setDishes(data.dishes);
    } catch (err) {
      setError('Failed to analyze menu. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetApp = () => {
    setSelectedFile(null);
    setPreview(null);
    setDishes([]);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-orange-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-orange-500 to-amber-600 p-3 rounded-xl shadow-lg">
              <ChefHat className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                Menu Decoder
              </h1>
              <p className="text-gray-600 text-sm mt-1">Understand every dish with AI-powered analysis</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Upload Section */}
        {!dishes.length && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl border border-orange-100 p-8">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-100 to-amber-100 rounded-full mb-4">
                  <Camera className="w-8 h-8 text-orange-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Menu Photo</h2>
                <p className="text-gray-600">Take a photo or upload an image of the restaurant menu</p>
              </div>

              {/* Upload Area */}
              <div className="mb-6">
                <label className="relative block">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div className="border-3 border-dashed border-orange-200 rounded-xl p-12 text-center cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-all duration-200">
                    {preview ? (
                      <div className="space-y-4">
                        <img src={preview} alt="Menu preview" className="max-h-64 mx-auto rounded-lg shadow-md" />
                        <p className="text-sm text-gray-600">Click to change image</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Upload className="w-12 h-12 text-orange-400 mx-auto" />
                        <div>
                          <p className="text-lg font-medium text-gray-700">Click to upload menu image</p>
                          <p className="text-sm text-gray-500 mt-1">PNG, JPG up to 10MB</p>
                        </div>
                      </div>
                    )}
                  </div>
                </label>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              {/* Analyze Button */}
              <button
                onClick={analyzeMenu}
                disabled={!selectedFile || loading}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-600 text-white font-semibold py-4 px-6 rounded-xl hover:from-orange-600 hover:to-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analyzing Menu...
                  </>
                ) : (
                  <>
                    <Utensils className="w-5 h-5" />
                    Analyze Menu
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Results Section */}
        {dishes.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-gray-900">Menu Items Decoded</h2>
              <button
                onClick={resetApp}
                className="px-6 py-3 bg-white border-2 border-orange-500 text-orange-600 font-semibold rounded-xl hover:bg-orange-50 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Analyze Another Menu
              </button>
            </div>

            <div className="grid gap-8">
              {dishes.map((dish, index) => (
                <div key={index} className="bg-white rounded-2xl shadow-xl border border-orange-100 overflow-hidden hover:shadow-2xl transition-shadow duration-300">
                  <div className="grid md:grid-cols-3 gap-6">
                    {/* Dish Info */}
                    <div className="md:col-span-2 p-8">
                      <div className="flex items-start gap-3 mb-4">
                        <span className="bg-gradient-to-br from-orange-500 to-amber-600 text-white font-bold text-lg w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                          {index + 1}
                        </span>
                        <div className="flex-1">
                          <h3 className="text-2xl font-bold text-gray-900 mb-2">{dish.name}</h3>
                          {dish.price && (
                            <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                              {dish.price}
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-gray-700 leading-relaxed mb-6">{dish.description}</p>

                      <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-5 border border-orange-100">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <Utensils className="w-5 h-5 text-orange-600" />
                          Main Ingredients
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {dish.ingredients.map((ingredient, i) => (
                            <span key={i} className="bg-white px-4 py-2 rounded-full text-sm text-gray-700 border border-orange-200 shadow-sm">
                              {ingredient}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Images */}
                    <div className="bg-gradient-to-br from-orange-100 to-amber-100 p-6 flex items-center justify-center">
                      {dish.images && dish.images.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3 w-full">
                          {dish.images.slice(0, 4).map((img, i) => (
                            <img
                              key={i}
                              src={img}
                              alt={`${dish.name} ${i + 1}`}
                              className="w-full h-32 object-cover rounded-xl shadow-md hover:scale-105 transition-transform duration-200"
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="text-center text-gray-500">
                          <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No images available</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-orange-100 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-gray-600">
          <p>Powered by Gemini AI • Never be confused by fancy menus again</p>
        </div>
      </footer>
    </div>
  );
}