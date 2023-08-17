<?php 
$conn = require_once("config.php");

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $username = $_POST["username"];
    $password = $_POST["password"];
    
    $check = "SELECT * FROM user WHERE username = '" . $username . "'";
    $result = mysqli_query($conn, $check);
    
    if (mysqli_num_rows($result) == 0) {
        $sql = "INSERT INTO user (username, password) VALUES ('" . $username . "','" . $password . "')";
        
        if (mysqli_query($conn, $sql)) {
            echo "註冊成功！3 秒後將自動跳轉頁面<br>";
            echo "<a href='index.php'>未成功跳轉頁面請點此</a>";
            header("refresh:3;url=index.php");
            exit;
        } else {
            echo "Error creating table: " . mysqli_error($conn);
        }
    } else {
        echo "該帳號有人使用！<br>3 秒後將自動跳轉<br>";
        echo "<a href='register.html'>未成功跳轉頁面請點此</a>";
        header('HTTP/1.0 302 Found');
        header("refresh:3;url=register.html");
        exit;
    }
}

mysqli_close($conn);

function function_alert($message) { 
    // Display the alert box  
    echo "<script>alert('$message');
          window.location.href='index.php';
          </script>"; 
    return false;
} 
?>
