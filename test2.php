<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "Remote Address: " . $_SERVER['REMOTE_ADDR'] . "\n";
echo "Server Name: " . $_SERVER['SERVER_NAME'] . "\n";
echo "Server Address: " . $_SERVER['SERVER_ADDR'] . "\n";
echo "Server Port: " . $_SERVER['SERVER_PORT'] . "\n";
echo "Document Root: " . $_SERVER['DOCUMENT_ROOT'] . "\n";
echo "Script Filename: " . $_SERVER['SCRIPT_FILENAME'] . "\n";
echo "HTTP Request: " . $_SERVER['REQUEST_METHOD'] . " " . $_SERVER['REQUEST_URI'] . " " . $_SERVER['SERVER_PROTOCOL'] . "\n";

echo "\nHello World!";
?> 