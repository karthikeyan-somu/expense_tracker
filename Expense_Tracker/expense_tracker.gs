const OPENAI_API_KEY = 'OPENAI_API_KEY'; // Replace with your real key

function extractBankExpenses() {
  try {
    const sheet = SpreadsheetApp.openById('yoursheetid').getSheetByName('yoursheetname');

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const after = Utilities.formatDate(yesterday, "Asia/Kolkata", "yyyy/MM/dd");
    const before = Utilities.formatDate(today, "Asia/Kolkata", "yyyy/MM/dd");

    const query = `after:${after} before:${before} from:(alerts@hdfcbank.net OR icicibank OR sbi OR axisbank OR kotak OR yesbank) (subject:(debited OR transaction OR txn OR payment OR UPI OR Account) OR body:(debited OR transaction OR UPI OR payment))`;
    const threads = GmailApp.search(query);

    Logger.log(`📥 Found ${threads.length} threads between ${after} and ${before}`);

    let successCount = 0;

    if (threads.length > 0) {
      threads.forEach(thread => {
        const messages = thread.getMessages();
        messages.forEach(msg => {
          const cleanBody = msg.getPlainBody().replace(/\s+/g, ' ').trim();
          const subject = msg.getSubject();
          const date = msg.getDate();

          // 🚫 Skip emails that don't look like transaction notifications
          const transactionClues = /(debited|credited|payment|transfer|IMPS|NEFT|RTGS|INR|Rs|₹|\d{2,}[.]\d{2})/i;
          if (!transactionClues.test(cleanBody)) {
            Logger.log('⚡ Skipping non-transaction email: ' + subject);
            return;
          }

          // 🚫 Skip failed transactions
          const failureKeywords = /(failed|unsuccessful|declined|unable to process|reversed|failure)/i;
          if (failureKeywords.test(cleanBody)) {
            Logger.log('❌ Skipping failed transaction email: ' + subject);
            return;
          }
          
          Logger.log('Proper transaction email: ' + subject);
          const enrichedData = getChatGPTParsedExpense(cleanBody, subject, date);

          if (enrichedData && enrichedData.amount) {
            let cleanAmount = enrichedData.amount.replace(/[^\d.]/g, ''); // Remove INR, ₹ etc
            sheet.appendRow([
              enrichedData.date || date,
              enrichedData.bank || 'Unknown',
              cleanAmount,
              enrichedData.merchant || 'Unknown',
              enrichedData.category || 'Uncategorized',
              enrichedData.classification || 'Needs',
              enrichedData.transaction_type || 'Debit'
            ]);
            successCount++;
          }
        });
      });
    }

    sendSuccessEmail(successCount, threads.length, after);

  } catch (error) {
    Logger.log('❌ Error: ' + error.toString());
    sendFailureEmail(error);
  }
}

function getChatGPTParsedExpense(body, subject, date) {
  const prompt = `
You are a smart financial transaction parser. Read the following bank transaction email and return a JSON object with these fields:
- date (in MM/DD/YYYY format)
- amount (only number, no INR or ₹)
- bank (just the bank name)
- merchant (receiver, payee, store name)
- category (Food, Shopping, Travel, Bills, ATM Withdrawal, Transfer, etc.)
- classification (Needs, Wants, Savings)
- transaction_type (Debit, Credit, Transfer)

Only respond with JSON in this format:

{
 "date": "MM/DD/YYYY",
 "amount": "1234.56",
 "bank": "HDFC",
 "merchant": "Amazon",
 "category": "Shopping",
 "classification": "Wants",
 "transaction_type": "Debit"
}

DO NOT add any explanation or text outside JSON.

Here is the email:
Subject: ${subject}
Date: ${date}
Body: ${body}
 `.trim();

  const payload = {
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    Logger.log('📡 Sending request to OpenAI...');
    const res = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', options);
    const code = res.getResponseCode();
    const text = res.getContentText();

    Logger.log(`✅ OpenAI Status: ${code}`);
    Logger.log(`📬 Response: ${text}`);

    if (code !== 200) throw new Error(`HTTP Error ${code}`);

    const data = JSON.parse(text);
    const reply = data.choices[0].message.content.trim();

    Logger.log('📦 GPT Reply:\n' + reply);

    const parsed = JSON.parse(reply); 
    return parsed;
  } catch (e) {
    Logger.log('❌ Error calling or parsing OpenAI response: ' + e.toString());
    return null;
  }
}

function sendSuccessEmail(successfulParses, totalEmails, dateRangeStart) {
  const email = "XXXXX@gmail.com";
  const subject = `✅ Bank Expenses Sync Report for ${dateRangeStart}`;
  const body = `Hi,

The extractBankExpenses() function ran successfully.

Summary for ${dateRangeStart}:
- Emails found: ${totalEmails}
- Successful expenses parsed: ${successfulParses}

Have a great day! ☀️`;

  MailApp.sendEmail(email, subject, body);
}

function sendFailureEmail(error) {
  const email = "XXXXX@gmail.com";
  const subject = "❌ Bank Expense Script Failed";
  const body = `Hi,

The extractBankExpenses() function failed at ${new Date()}.

Error Details:
${error.toString()}`;

  MailApp.sendEmail(email, subject, body);
}
