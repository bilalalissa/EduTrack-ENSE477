<?php

error_log("saveTestResult.php accessed");

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    if ($data) {
        $filePath = 'testResults.json';
        $jsonData = file_get_contents($filePath);
        $results = json_decode($jsonData, true);

        if (!is_array($results)) {
            $results = ['results' => []];
        }

        $results['results'][] = $data;

        if (file_put_contents($filePath, json_encode($results, JSON_PRETTY_PRINT)) === false) {
            error_log("Failed to write to testResults.json");
            echo json_encode(['status' => 'error', 'message' => 'Failed to write to file']);
        } else {
            echo json_encode(['status' => 'success']);
        }
    } else {
        error_log("Invalid data received");
        echo json_encode(['status' => 'error', 'message' => 'Invalid data']);
    }
} else {
    error_log("Invalid request method");
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method']);
}
