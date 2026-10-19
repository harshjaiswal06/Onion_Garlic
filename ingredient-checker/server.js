
const express = require("express");
const multer = require("multer");
const Tesseract = require("tesseract.js");
const cors = require("cors");

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Configure image upload
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter: (req, file, callback) => {
        if (file.mimetype.startsWith("image/")) {
            callback(null, true);
        } else {
            callback(new Error("Please upload an image file"));
        }
    }
});

// Clean OCR text without deleting ordinary ingredient punctuation
function cleanIngredientText(text) {
    return text
        .replace(/\r/g, "\n")
        .replace(/[|_~=<>[\]{}\\]/g, " ")
        .replace(/[^\p{L}\p{N}\s,.;:()%&/'-]/gu, " ")
        .replace(/[ \t]+/g, " ")
        .replace(/\n\s*\n+/g, "\n")
        .trim();
}

// Extract the likely ingredient section
function organizeIngredientText(text) {
    const cleanedText = cleanIngredientText(text);

    const match = cleanedText.match(
        /\bingredients?\s*[:\-]?\s*([\s\S]*)/i
    );

    if (!match) {
        return [];
    }

    let ingredientText = match[1];

    // Stop at common sections that follow ingredients
    ingredientText = ingredientText.split(
        /\b(?:nutrition facts|nutritional information|distributed by|manufactured by|allergen information|storage instructions|best before)\b/i
    )[0];

    // Split the ingredient section into individual items
    return ingredientText
        .replace(/\s+/g, " ")
        .replace(/[.;]\s*/g, ",")
        .split(",")
        .map(item => item.trim())
        .filter(item => item.length > 1)
        .filter(item => !/^[\d\s%()./-]+$/.test(item))
        .slice(0, 40);
}

// Check the extracted ingredients
function checkIngredients(ingredients) {
    const text = ingredients.join(" ").toLowerCase();

    return {
        onionDetected: /\bonion\b/.test(text),
        garlicDetected: /\bgarlic\b/.test(text)
    };
}

// Basic API test
app.get("/api", (req, res) => {
    res.json({
        message: "Ingredient Checker API is working",
        status: "success"
    });
});

// Check manually provided ingredient text
app.post("/api/check-ingredients", (req, res) => {
    const ingredients = req.body.ingredients;

    if (!ingredients || typeof ingredients !== "string") {
        return res.status(400).json({
            error: "Please provide ingredients as text"
        });
    }

    const text = ingredients.toLowerCase();

    res.json({
        onionDetected: /\bonion\b/.test(text),
        garlicDetected: /\bgarlic\b/.test(text)
    });
});

// Upload image, perform OCR, and organize results
app.post(
    "/api/upload-image",
    upload.single("image"),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    error: "Please upload an image"
                });
            }

            const result = await Tesseract.recognize(
                req.file.buffer,
                "eng"
            );

            const rawText = result.data.text;
            const ingredients = organizeIngredientText(rawText);
            const detection = checkIngredients(ingredients);

            res.json({
                message: "Image processed successfully",
                ingredients: ingredients,
                onionDetected: detection.onionDetected,
                garlicDetected: detection.garlicDetected
            });
        } catch (error) {
            console.error("OCR error:", error);

            res.status(500).json({
                error: "Could not read text from the image"
            });
        }
    }
);

// Handle upload errors, including files rejected by Multer
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        return res.status(400).json({
            error: error.code === "LIMIT_FILE_SIZE"
                ? "Image must be 5 MB or smaller"
                : error.message
        });
    }

    if (error) {
        return res.status(400).json({
            error: error.message || "Request failed"
        });
    }

    next();
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
