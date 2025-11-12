# EventBridge rule to refresh property data monthly
resource "aws_scheduler_schedule" "monthly_property_refresh" {
  name        = "rentaliq-monthly-property-refresh"
  description = "Triggers monthly property data refresh from Zillow API"

  # Run on the 1st of every month at 2 AM UTC
  schedule_expression = "cron(0 2 1 * ? *)"

  flexible_time_window {
    mode = "OFF"
  }

  target {
    arn      = aws_lambda_function.property_refresh_cron.arn
    role_arn = aws_iam_role.eventbridge_scheduler_role.arn

    input = jsonencode({
      cronSecret = var.cron_secret
    })
  }
}

# Lambda function to call the API endpoint
resource "aws_lambda_function" "property_refresh_cron" {
  filename         = "${path.module}/lambda/property-refresh-cron.zip"
  function_name    = "rentaliq-property-refresh-cron"
  role            = aws_iam_role.lambda_cron_role.arn
  handler         = "index.handler"
  source_code_hash = filebase64sha256("${path.module}/lambda/property-refresh-cron.zip")
  runtime         = "nodejs18.x"
  timeout         = 300 # 5 minutes

  environment {
    variables = {
      API_ENDPOINT = var.amplify_domain
      CRON_SECRET  = var.cron_secret
    }
  }
}

# IAM role for Lambda
resource "aws_iam_role" "lambda_cron_role" {
  name = "rentaliq-lambda-cron-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# IAM policy for Lambda
resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_cron_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# IAM role for EventBridge Scheduler
resource "aws_iam_role" "eventbridge_scheduler_role" {
  name = "rentaliq-eventbridge-scheduler-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "scheduler.amazonaws.com"
        }
      }
    ]
  })
}

# IAM policy for EventBridge to invoke Lambda
resource "aws_iam_role_policy" "eventbridge_invoke_lambda" {
  name = "rentaliq-eventbridge-invoke-lambda"
  role = aws_iam_role.eventbridge_scheduler_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "lambda:InvokeFunction"
        ]
        Resource = aws_lambda_function.property_refresh_cron.arn
      }
    ]
  })
}

# Allow EventBridge to invoke Lambda
resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.property_refresh_cron.function_name
  principal     = "scheduler.amazonaws.com"
  source_arn    = aws_scheduler_schedule.monthly_property_refresh.arn
}

# Outputs
output "eventbridge_schedule_arn" {
  description = "ARN of the EventBridge schedule for monthly property refresh"
  value       = aws_scheduler_schedule.monthly_property_refresh.arn
}

output "lambda_function_name" {
  description = "Name of the Lambda function for property refresh cron"
  value       = aws_lambda_function.property_refresh_cron.function_name
}
