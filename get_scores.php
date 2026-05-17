<?php // return top 10 players , its called by leaderboard.html using ajax. 
header('Content-Type: application/json'); // tell the browser that its json type .
header('Access-Control-Allow-Origin: *');//Allow any website to access this API  for testing . 

require 'db.php';

try { // Prepare and execute the SQL query. We join the scores table with the users table to get the username for each score, order by score descending, and limit to the top 10 results.
    $stmt = $pdo->query(" 
        SELECT users.username AS player_name,  -- get the player's name from the 'users' table
               scores.score,  -- get the score value
               scores.created_at  -- get the date/time when the score was saved
        FROM scores  -- start with the 'scores' table (main table)
        JOIN users ON scores.user_id = users.id -- connect each score to the user who earned it
        ORDER BY scores.score DESC  -- sort the results from highest score to lowest 
        LIMIT 10
    ");
    $scores = $stmt->fetchAll(PDO::FETCH_ASSOC);  //Fetch all results as an array
    echo json_encode($scores); //Convert the array to JSON and output it
} catch (PDOException $e) {
    http_response_code(500); //If something goes wrong, send error code 500 (server error)
    echo json_encode(['error' => 'Failed to load scores']); //Output a JSON error message 
}
?>