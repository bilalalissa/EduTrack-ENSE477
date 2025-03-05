<?php
$host = "localhost";  // server name
$db_user = "root";     // database username
$db_pwd = "";     // database password
$db_name = "edutrack";     // database name

$attr = "mysql:host=$host;dbname=$db_name;charset=utf8";
// PDO is safer practice for security reasons
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $conn = new PDO($attr, $db_user, $db_pwd, $options);
} catch (PDOException $e) {
    die("Connection failed: " . $e->getMessage());
}