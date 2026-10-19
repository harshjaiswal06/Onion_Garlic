
import { useState } from "react";
import "./App.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3000"
).replace(/\/+$/, "");

function App() {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const hasWarning = Boolean(
    result?.onionDetected || result?.garlicDetected
  );

  function handleImageChange(event) {
    const selectedImage = event.target.files?.[0];

    if (!selectedImage) return;

    if (!selectedImage.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }

    if (selectedImage.size > 5 * 1024 * 1024) {
      setError("Please select an image smaller than 5 MB.");
      return;
    }

    if (preview) URL.revokeObjectURL(preview);

    setImage(selectedImage);
    setPreview(URL.createObjectURL(selectedImage));
    setResult(null);
    setError("");
  }

  async function handleCheckIngredients() {
    if (!image) {
      setError("Please upload a food packet image first.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("image", image);

    try {
      const response = await fetch(`${API_URL}/api/upload-image`, {
        method: "POST",
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong.");
      }

      setResult(data);
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Could not reach the server. Please try again shortly."
          : err.message
      );
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    if (preview) URL.revokeObjectURL(preview);

    setImage(null);
    setPreview("");
    setResult(null);
    setError("");

    const input = document.getElementById("food-image");
    if (input) input.value = "";
  }

  return (
    <main className={`app ${hasWarning ? "alert-mode" : ""}`}>
      <section className="card">
        <header className="header">
          <div className="logo" aria-hidden="true">🥗</div>
          <p className="eyebrow">SMART FOOD CHECKER</p>
          <h1>Onion & Garlic Detector</h1>
          <p className="description">
            Upload a photo of your packaged food label to check
            its recognized ingredient list.
          </p>
        </header>

        <label className="upload-box" htmlFor="food-image">
          {preview ? (
            <img
              className="preview-image"
              src={preview}
              alt="Selected food packet"
            />
          ) : (
            <span className="upload-placeholder">
              <span className="camera-icon" aria-hidden="true">📷</span>
              <strong>Upload food packet image</strong>
              <small>Click here to select a photo</small>
              <small>Image files only · Maximum 5 MB</small>
            </span>
          )}

          <input
            id="food-image"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
          />
        </label>

        <div className="actions">
          <button
            className="check-button"
            onClick={handleCheckIngredients}
            disabled={loading || !image}
          >
            {loading ? "Reading ingredients..." : "Check Ingredients"}
          </button>

          {(image || result) && (
            <button
              className="reset-button"
              onClick={handleReset}
              disabled={loading}
            >
              Choose Another Image
            </button>
          )}
        </div>

        {loading && (
          <p className="loading-message" role="status">
            Reading your label. This may take a few seconds...
          </p>
        )}

        {error && <p className="error-message" role="alert">{error}</p>}

        {result && (
          <section className="results" aria-live="polite">
            {hasWarning ? (
              <div className="warning-banner" role="alert">
                <div className="ingredient-pictures">
                  {result.onionDetected && (
                    <span role="img" aria-label="Onion">🧅</span>
                  )}
                  {result.garlicDetected && (
                    <span role="img" aria-label="Garlic">🧄</span>
                  )}
                </div>

                <p className="result-label">INGREDIENT ALERT</p>
                <h2>
                  {result.onionDetected && result.garlicDetected
                    ? "Onion & Garlic Detected!"
                    : result.onionDetected
                      ? "Onion Detected!"
                      : "Garlic Detected!"}
                </h2>
                <p>
                  {[
                    result.onionDetected && "onion",
                    result.garlicDetected && "garlic"
                  ].filter(Boolean).join(" and ")}{" "}
                  {result.onionDetected && result.garlicDetected
                    ? "were"
                    : "was"}{" "}
                  found in the recognized ingredient text.
                </p>
              </div>
            ) : (
              <div className="clear-banner">
                <span role="img" aria-label="Check">✅</span>
                <p className="result-label">TEXT CHECK COMPLETE</p>
                <h2>No Onion or Garlic Detected</h2>
                <p>
                  Neither word was found in the recognized ingredient
                  text. Verify the actual package label as well.
                </p>
              </div>
            )}

            <div className="ingredient-status">
              <div className="status-item">
                <span aria-hidden="true">🧅</span>
                <span>Onion</span>
                <strong className={
                  result.onionDetected ? "detected" : "not-detected"
                }>
                  {result.onionDetected ? "Detected" : "Not detected"}
                </strong>
              </div>

              <div className="status-item">
                <span aria-hidden="true">🧄</span>
                <span>Garlic</span>
                <strong className={
                  result.garlicDetected ? "detected" : "not-detected"
                }>
                  {result.garlicDetected ? "Detected" : "Not detected"}
                </strong>
              </div>
            </div>

            <details className="extracted-text" open>
              <summary>View organized ingredients</summary>

              {result.ingredients?.length > 0 ? (
                <ul className="ingredient-list">
                  {result.ingredients.map((ingredient, index) => {
                    const hasOnion = /\bonion\b/i.test(ingredient);
                    const hasGarlic = /\bgarlic\b/i.test(ingredient);

                    return (
                      <li key={`${ingredient}-${index}`}>
                        <span>{ingredient}</span>
                        <span className="ingredient-tags">
                          {hasOnion && (
                            <strong className="detected">Onion</strong>
                          )}
                          {hasGarlic && (
                            <strong className="detected">Garlic</strong>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p>
                  No clear ingredient list was recognized. Try a
                  sharper photo focused on the ingredients section.
                </p>
              )}
            </details>
          </section>
        )}

        <footer className="footer">
          <p>
            OCR can misread or miss ingredients. A result showing no
            match does not guarantee the product is free of onion or
            garlic. Always verify the package label.
          </p>
        </footer>
      </section>
    </main>
  );
}

export default App;
