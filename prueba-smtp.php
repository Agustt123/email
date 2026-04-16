<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require __DIR__ . '/vendor/autoload.php';

$mail = new PHPMailer(true);

try {
    $mail->isSMTP();
    $mail->Host = 'smtp.gmail.com';
    $mail->SMTPAuth = true;
    $mail->Username = 'zetallegue@gmail.com';
    $mail->Password = 'zetallegue1234';
    $mail->Port = 587;
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->CharSet = 'UTF-8';

    $mail->SMTPDebug = 2;

    $mail->setFrom('zetallegue@gmail.com', 'Prueba SMTP PHP');
    $mail->addAddress('agustintracheskyoficial@gmail.com', 'Agustin');

    $mail->isHTML(true);
    $mail->Subject = 'Prueba SMTP desde PHP';
    $mail->Body = '<b>Hola</b><br>Este es un correo de prueba enviado desde PHP con PHPMailer.';
    $mail->AltBody = 'Hola. Este es un correo de prueba enviado desde PHP con PHPMailer.';

    $mail->send();
    echo PHP_EOL . 'OK: correo enviado correctamente' . PHP_EOL;
} catch (Exception $e) {
    echo PHP_EOL . 'ERROR al enviar: ' . $mail->ErrorInfo . PHP_EOL;
}
