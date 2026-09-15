import cv2
import numpy as np
import joblib
import os


# ============================================================
# CONFIGURATION
# ============================================================

MODEL_PATH = os.path.join(
    os.path.dirname(__file__),
    "noise_classifier.pkl"
)


# ============================================================
# LOAD TRAINED NOISE CLASSIFIER
# ============================================================

noise_classifier = joblib.load(MODEL_PATH)


# ============================================================
# FEATURE EXTRACTION
# ============================================================

def extract_features(image):
    """
    Extract the same 6 features used during training.
    """

    image = image.astype(np.float32)

    # 1. Mean intensity
    mean = np.mean(image)

    # 2. Standard deviation
    std = np.std(image)

    # 3. Variance
    variance = np.var(image)

    # 4. Percentage of zero-valued pixels
    zero_ratio = np.mean(image == 0)

    # 5. Local variance
    mean_local = cv2.blur(image, (7, 7))
    mean_sq_local = cv2.blur(image ** 2, (7, 7))

    local_variance = np.mean(
        np.maximum(
            mean_sq_local - mean_local ** 2,
            0
        )
    )

    # 6. Sharpness
    laplacian = cv2.Laplacian(
        image,
        cv2.CV_32F
    )

    sharpness = laplacian.var()

    return np.array([[
        mean,
        std,
        variance,
        zero_ratio,
        local_variance,
        sharpness
    ]])


# ============================================================
# FILTERS
# ============================================================

def lee_filter(image, window_size=7, noise_variance=None):

    image_float = image.astype(np.float32)

    local_mean = cv2.boxFilter(
        image_float,
        -1,
        (window_size, window_size),
        normalize=True
    )

    local_mean_sq = cv2.boxFilter(
        image_float ** 2,
        -1,
        (window_size, window_size),
        normalize=True
    )

    local_variance = (
        local_mean_sq -
        local_mean ** 2
    )

    local_variance = np.maximum(
        local_variance,
        0
    )

    if noise_variance is None:
        noise_variance = np.median(
            local_variance
        )

    weight = (
        (local_variance - noise_variance) /
        (local_variance + 1e-8)
    )

    weight = np.clip(
        weight,
        0,
        1
    )

    filtered = (
        local_mean +
        weight * (image_float - local_mean)
    )

    return np.clip(
        filtered,
        0,
        255
    ).astype(np.uint8)


def median_filter(image):

    return cv2.medianBlur(
        image,
        5
    )


def bilateral_filter(image):

    return cv2.bilateralFilter(
        image,
        9,
        75,
        75
    )


def gaussian_filter(image):

    return cv2.GaussianBlur(
        image,
        (5, 5),
        0
    )


# ============================================================
# NOISE → FILTER MAPPING
# ============================================================

FILTER_MAP = {

    "gaussian": (
        lee_filter,
        "Lee"
    ),

    "speckle": (
        median_filter,
        "Median"
    ),

    "dropout": (
        bilateral_filter,
        "Bilateral"
    ),

    "blur": (
        lee_filter,
        "Lee"
    )
}


# ============================================================
# MAIN ADAPTIVE FILTER
# ============================================================

def adaptive_filter(image):

    """
    Automatically detects the noise type
    and applies the corresponding filter.

    Returns:
        filtered_image
        noise_type
        filter_name
        confidence
    """

    # Convert to grayscale
    if len(image.shape) == 3:
        if image.shape[2] == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        elif image.shape[2] == 4:
            gray = cv2.cvtColor(image, cv2.COLOR_BGRA2GRAY)
        elif image.shape[2] == 1:
            gray = image[:, :, 0]
        else:
            gray = image.copy()
    else:
        gray = image.copy()


    # --------------------------------------------------------
    # Extract features
    # --------------------------------------------------------

    features = extract_features(gray)


    # --------------------------------------------------------
    # Predict noise type
    # --------------------------------------------------------

    noise_type = noise_classifier.predict(
        features
    )[0]


    # --------------------------------------------------------
    # Prediction confidence
    # --------------------------------------------------------

    probabilities = noise_classifier.predict_proba(
        features
    )[0]

    confidence = float(
        np.max(probabilities)
    )


    # --------------------------------------------------------
    # Select filter
    # --------------------------------------------------------

    filter_function, filter_name = FILTER_MAP[
        noise_type
    ]


    # --------------------------------------------------------
    # Apply filter
    # --------------------------------------------------------

    filtered_image = filter_function(
        gray
    )


    return (
        filtered_image,
        noise_type,
        filter_name,
        confidence
    )