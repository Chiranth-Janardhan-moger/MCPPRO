#!/usr/bin/env python3
"""
Phase 4: OCR Subsystem Benchmark
Evaluates PyTesseract and EasyOCR engines on ground-truth synthetic text images.
Calculates extraction latency, throughput (chars/sec), Character Error Rate (CER), and Word Error Rate (WER).
"""

import os
import sys
import time
import json
import statistics
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

RAW_RESULTS_DIR = Path("benchmarks/results/raw")
RAW_RESULTS_DIR.mkdir(parents=True, exist_ok=True)

# Levenshtein distance for CER and WER
def levenshtein_distance(ref: list, hyp: list) -> int:
    d = [[0] * (len(hyp) + 1) for _ in range(len(ref) + 1)]
    for i in range(len(ref) + 1):
        d[i][0] = i
    for j in range(len(hyp) + 1):
        d[0][j] = j
    for i in range(1, len(ref) + 1):
        for j in range(1, len(hyp) + 1):
            if ref[i - 1] == hyp[j - 1]:
                d[i][j] = d[i - 1][j - 1]
            else:
                d[i][j] = 1 + min(d[i - 1][j], d[i][j - 1], d[i - 1][j - 1])
    return d[len(ref)][len(hyp)]

def compute_cer(reference: str, hypothesis: str) -> float:
    ref_chars = list(reference)
    hyp_chars = list(hypothesis)
    if not ref_chars:
        return 0.0 if not hyp_chars else 1.0
    dist = levenshtein_distance(ref_chars, hyp_chars)
    return round(dist / len(ref_chars), 4)

def compute_wer(reference: str, hypothesis: str) -> float:
    ref_words = reference.split()
    hyp_words = hypothesis.split()
    if not ref_words:
        return 0.0 if not hyp_words else 1.0
    dist = levenshtein_distance(ref_words, hyp_words)
    return round(dist / len(ref_words), 4)

# Create benchmark test cards with known ground truth
OCR_TEST_CASES = [
    {
        "id": "ocr_card_01_standard",
        "ground_truth": "The quick brown fox jumps over the lazy dog 1234567890",
        "font_size": 24
    },
    {
        "id": "ocr_card_02_technical",
        "ground_truth": "MCPPRO Agent Orchestration Framework and RAG Vector Retrieval System",
        "font_size": 20
    },
    {
        "id": "ocr_card_03_financial",
        "ground_truth": "Total Q3 Revenue: $17.2M with Operating Income of $4.8M (Growth +38.7%)",
        "font_size": 22
    },
    {
        "id": "ocr_card_04_dense_params",
        "ground_truth": "Parameters: CHUNK_SIZE=1000 CHUNK_OVERLAP=200 DIMENSIONS=1536 PORT=8001",
        "font_size": 18
    },
    {
        "id": "ocr_card_05_multiline",
        "ground_truth": "FastAPI uvicorn LangChain Qdrant InMemoryVectorStore FastMCP streamable-http",
        "font_size": 20
    }
]

def generate_ocr_test_images():
    img_dir = Path("benchmarks/datasets/ocr_samples")
    img_dir.mkdir(parents=True, exist_ok=True)
    generated = []
    
    for case in OCR_TEST_CASES:
        img_path = img_dir / f"{case['id']}.png"
        img = Image.new('RGB', (1000, 150), color=(255, 255, 255))
        d = ImageDraw.Draw(img)
        d.rectangle([(5, 5), (995, 145)], outline=(0, 0, 0), width=2)
        d.text((30, 55), case["ground_truth"], fill=(0, 0, 0))
        img.save(str(img_path))
        generated.append({
            "id": case["id"],
            "image_path": str(img_path),
            "ground_truth": case["ground_truth"]
        })
    return generated

def run_ocr_benchmark():
    print("==================================================")
    print("           Phase 4: OCR Subsystem Benchmark       ")
    print("==================================================")

    test_images = generate_ocr_test_images()

    # Check PyTesseract
    tesseract_available = False
    try:
        import pytesseract
        pytesseract.get_tesseract_version()
        tesseract_available = True
        print("PyTesseract binary: Available")
    except Exception as e:
        print(f"PyTesseract binary: NOT AVAILABLE ({e})")

    # Check EasyOCR
    easyocr_available = False
    easyocr_reader = None
    try:
        import easyocr
        import logging
        # Suppress verbose EasyOCR logs
        easyocr_reader = easyocr.Reader(['en'], gpu=False, verbose=False)
        easyocr_available = True
        print("EasyOCR Engine: Available")
    except Exception as e:
        print(f"EasyOCR Engine: NOT AVAILABLE ({e})")

    results = []

    # 1. Benchmark PyTesseract
    if tesseract_available:
        import pytesseract
        for test in test_images:
            img = Image.open(test["image_path"])
            start_t = time.perf_counter()
            try:
                extracted_text = pytesseract.image_to_string(img, config='--psm 6').strip()
                latency = time.perf_counter() - start_t
                cer = compute_cer(test["ground_truth"], extracted_text)
                wer = compute_wer(test["ground_truth"], extracted_text)
                chars_extracted = len(extracted_text)
                
                results.append({
                    "test_id": test["id"],
                    "engine": "pytesseract",
                    "success": True,
                    "latency_s": round(latency, 5),
                    "ground_truth": test["ground_truth"],
                    "extracted_text": extracted_text,
                    "chars_extracted": chars_extracted,
                    "throughput_chars_per_s": round(chars_extracted / latency, 2) if latency > 0 else 0,
                    "cer": cer,
                    "wer": wer
                })
            except Exception as e:
                results.append({
                    "test_id": test["id"],
                    "engine": "pytesseract",
                    "success": False,
                    "error": str(e),
                    "latency_s": round(time.perf_counter() - start_t, 5)
                })
    else:
        results.append({
            "engine": "pytesseract",
            "status": "NOT MEASURABLE",
            "reason": "Tesseract OCR binary (tesseract.exe) is not installed in local PATH on this Windows host."
        })

    # 2. Benchmark EasyOCR
    if easyocr_available and easyocr_reader:
        import numpy as np
        for test in test_images:
            img = Image.open(test["image_path"])
            img_np = np.array(img)
            start_t = time.perf_counter()
            try:
                ocr_out = easyocr_reader.readtext(img_np, detail=0)
                extracted_text = " ".join(ocr_out).strip()
                latency = time.perf_counter() - start_t
                cer = compute_cer(test["ground_truth"], extracted_text)
                wer = compute_wer(test["ground_truth"], extracted_text)
                chars_extracted = len(extracted_text)
                
                results.append({
                    "test_id": test["id"],
                    "engine": "easyocr",
                    "success": True,
                    "latency_s": round(latency, 5),
                    "ground_truth": test["ground_truth"],
                    "extracted_text": extracted_text,
                    "chars_extracted": chars_extracted,
                    "throughput_chars_per_s": round(chars_extracted / latency, 2) if latency > 0 else 0,
                    "cer": cer,
                    "wer": wer
                })
            except Exception as e:
                results.append({
                    "test_id": test["id"],
                    "engine": "easyocr",
                    "success": False,
                    "error": str(e),
                    "latency_s": round(time.perf_counter() - start_t, 5)
                })
    else:
        results.append({
            "engine": "easyocr",
            "status": "NOT MEASURABLE",
            "reason": "EasyOCR model loading failed or PyTorch CPU backend was unable to complete initialization."
        })

    # Engine Comparison Summary
    engine_summaries = {}
    for eng in ["pytesseract", "easyocr"]:
        eng_runs = [r for r in results if r.get("engine") == eng and r.get("success")]
        if eng_runs:
            latencies = [r["latency_s"] for r in eng_runs]
            cers = [r["cer"] for r in eng_runs]
            wers = [r["wer"] for r in eng_runs]
            throughputs = [r["throughput_chars_per_s"] for r in eng_runs]
            
            engine_summaries[eng] = {
                "status": "MEASURED",
                "test_count": len(eng_runs),
                "mean_latency_s": round(statistics.mean(latencies), 5),
                "median_latency_s": round(statistics.median(latencies), 5),
                "mean_cer": round(statistics.mean(cers), 4),
                "mean_wer": round(statistics.mean(wers), 4),
                "mean_throughput_chars_per_s": round(statistics.mean(throughputs), 2),
                "pages_per_second": round(1.0 / statistics.mean(latencies), 2)
            }
        else:
            engine_summaries[eng] = {
                "status": "NOT MEASURABLE",
                "reason": f"{eng} engine could not be executed on current environment."
            }

    raw_output = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
        "engine_summaries": engine_summaries,
        "raw_measurements": results
    }

    output_file = RAW_RESULTS_DIR / "ocr_benchmark.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(raw_output, f, indent=2)

    print(f"Saved OCR Benchmark results to {output_file}")
    for eng, summ in engine_summaries.items():
        print(f"Engine {eng.upper()}: {summ}")

    return raw_output

if __name__ == "__main__":
    run_ocr_benchmark()
