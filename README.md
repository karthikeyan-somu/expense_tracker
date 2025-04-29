Expense Tracker with Google Sheets & OpenAI

This project helps you automatically categorize and classify expenses in a Google Sheet using OpenAI's API.

**Setup Instructions**

1. Create Your Google Sheet  
Create a new Google Sheet with the following columns:
- Date
- Bank
- Amount 
- Merchant
- Category
- Classification
- Debit/Credit
- Remarks

2. Open Apps Script
In your Google Sheet:
- Go to Extensions -> Apps Script
- Delete any placeholder code
- Copy the content from expense_tracker.gs and paste it here

3. Add Your OpenAI API Key and email id
- In `Apps Script`, add your [OpenAI API key](https://platform.openai.com/account/api-keys) to the script or add other LLM's API key.
- Add your email id in which you want to receive the success/failure parse emails. 

4. Deploy
- Click `Deploy` → `Test deployments` or `Run` to trigger the categorization
- Grant the necessary permissions when prompted

5. How It Works
The script will automatically parse through the email id in which the Google Sheet was created. It would go through the previous day emails identify the emails from bank. The script sends the body of the email to OpenAI and returns bank, amount, smart classification (e.g., `Food`, `Travel`, `Work-related`, etc.) into the `Category` and `Classification` columns.

6. Setup Trigger
- Go to Triggers -> Add Trigger
- Setup the frequency and time in which the script should automatically run. 



