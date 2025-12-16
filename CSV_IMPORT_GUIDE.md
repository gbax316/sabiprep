# CSV Import Guide for SabiPrep Admin Portal

This guide provides comprehensive instructions for importing questions in bulk using the CSV import feature.

---

## Table of Contents

1. [Overview](#overview)
2. [Template Structure](#template-structure)
3. [Import Process](#import-process)
4. [Validation Rules](#validation-rules)
5. [Common Errors](#common-errors)
6. [Tips and Best Practices](#tips-and-best-practices)
7. [Troubleshooting](#troubleshooting)

---

## Overview

The CSV Import feature allows administrators and tutors to bulk upload questions to the SabiPrep question bank. This is particularly useful when:

- Migrating questions from another system
- Adding large batches of new questions
- Updating multiple questions at once
- Setting up initial content for new subjects/topics

**Key Features**:
- ✅ Template download for consistent formatting
- ✅ Pre-import validation with detailed error reporting
- ✅ Batch processing with progress tracking
- ✅ Import reports for audit trail
- ✅ Rollback capability for failed imports

---

## Template Structure

### Downloading the Template

1. Navigate to `/admin/import`
2. Click "Download CSV Template"
3. Open the downloaded file in Excel, Google Sheets, or any CSV editor

### Column Descriptions

The CSV template includes the following columns:

| Column | Required | Type | Description | Example |
|--------|----------|------|-------------|---------|
| `subject_id` | ✅ Yes | UUID | ID of the subject from database | `123e4567-e89b-12d3-a456-426614174000` |
| `topic_id` | ✅ Yes | UUID | ID of the topic from database | `987fcdeb-51a2-43d7-b456-426614174111` |
| `question_text` | ✅ Yes | Text | The question being asked | `What is the capital of Nigeria?` |
| `question_image_url` | ❌ No | URL | URL to question image (optional) | `https://example.com/image.jpg` |
| `question_type` | ✅ Yes | Enum | Type of question | `multiple_choice` |
| `option_a` | ✅ Yes | Text | First answer option | `Lagos` |
| `option_b` | ✅ Yes | Text | Second answer option | `Abuja` |
| `option_c` | ✅ Yes | Text | Third answer option | `Kano` |
| `option_d` | ✅ Yes | Text | Fourth answer option | `Port Harcourt` |
| `correct_answer` | ✅ Yes | Enum | Letter of correct option | `B` |
| `explanation` | ✅ Yes | Text | Detailed explanation of answer | `Abuja has been the capital since 1991...` |
| `difficulty_level` | ✅ Yes | Enum | Question difficulty | `intermediate` |
| `tags` | ❌ No | Text | Comma-separated tags | `geography, capitals, nigeria` |

### Valid Values

**question_type**:
- `multiple_choice` (currently the only supported type)

**correct_answer**:
- `A`, `B`, `C`, or `D` (case-insensitive, but uppercase recommended)

**difficulty_level**:
- `beginner`
- `intermediate`
- `advanced`

### Getting Subject and Topic IDs

Before filling the template, you need to get the correct IDs:

**Method 1: Through Admin Portal**
1. Navigate to `/admin/content`
2. Click on a subject to see its ID in the URL
3. Click on topics to see their IDs
4. Copy these IDs into your CSV

**Method 2: Through Database**
```sql
-- Get all subjects
SELECT id, name FROM subjects ORDER BY name;

-- Get topics for a specific subject
SELECT id, name, subject_id FROM topics 
WHERE subject_id = 'YOUR_SUBJECT_ID' 
ORDER BY order_index;
```

**Method 3: Through API** (for developers)
```bash
# Get subjects
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-app.com/api/admin/subjects

# Get topics
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-app.com/api/admin/topics?subjectId=SUBJECT_ID
```

### Example Rows

Here are example rows showing correct formatting:

```csv
subject_id,topic_id,question_text,question_image_url,question_type,option_a,option_b,option_c,option_d,correct_answer,explanation,difficulty_level,tags
123e4567-e89b-12d3-a456-426614174000,987fcdeb-51a2-43d7-b456-426614174111,"What is the capital of Nigeria?","",multiple_choice,Lagos,Abuja,Kano,"Port Harcourt",B,"Abuja has been the federal capital of Nigeria since 1991, replacing Lagos.",beginner,"geography, capitals, nigeria"
123e4567-e89b-12d3-a456-426614174000,987fcdeb-51a2-43d7-b456-426614174111,"Which year did Nigeria gain independence?","",multiple_choice,1957,1960,1963,1966,B,"Nigeria gained independence from British colonial rule on October 1, 1960.",intermediate,"history, independence, nigeria"
```

---

## Import Process

### Step-by-Step Guide

#### Step 1: Prepare Your CSV File

1. **Download the template** from `/admin/import`
2. **Get subject and topic IDs** using one of the methods above
3. **Fill in your questions** following the template structure
4. **Save the file** as CSV format (not Excel format)

⚠️ **Important**: 
- Do not modify column headers
- Keep all required columns even if some cells are empty
- Use UTF-8 encoding for special characters

#### Step 2: Upload for Validation

1. Navigate to `/admin/import`
2. Click "Choose File" or drag-and-drop your CSV
3. Click "Validate File"
4. Wait for validation to complete

**What Happens During Validation**:
- File format is checked
- All columns are verified
- Each row is validated against rules
- Subject and topic IDs are verified in database
- Duplicate questions are detected
- No data is saved yet

#### Step 3: Review Validation Results

After validation, you'll see one of two outcomes:

**✅ Validation Passed**:
- Green success message
- Summary: "X questions validated successfully"
- "Process Import" button appears
- You can proceed to import

**❌ Validation Failed**:
- Red error message
- Detailed error report shown
- List of specific errors with row numbers
- Download error report option
- Fix errors and re-upload

**Example Error Report**:
```
Row 1: Invalid subject_id - ID does not exist in database
Row 1: Missing required field - question_text is empty
Row 3: Invalid correct_answer - Must be A, B, C, or D (got: E)
Row 5: Invalid difficulty_level - Must be beginner, intermediate, or advanced (got: easy)
Row 7: Duplicate question detected - Question text already exists
```

#### Step 4: Process Import

Once validation passes:

1. Review the validation summary
2. Click "Process Import"
3. Confirm the import action
4. Watch the progress bar
5. Wait for completion (do not close the page)

**During Import**:
- Questions are inserted into database
- Progress updates in real-time
- Errors are logged if any occur
- Report is generated

#### Step 5: View Import Report

After import completes:

1. Success message with import summary
2. Link to detailed import report
3. Statistics: 
   - Total processed
   - Successfully imported
   - Failed (with reasons)
4. Option to download report

**Report Contents**:
- Import timestamp
- File name
- Total questions
- Success count
- Failure count  
- Detailed error list (if any)
- User who performed import

#### Step 6: Verify Imported Questions

1. Navigate to `/admin/questions`
2. Filter by subject/topic you just imported
3. Verify questions appear correctly
4. Spot-check a few questions for accuracy

### Import History

Access previous imports at `/admin/import/history`:

- View all past imports
- Filter by date or status
- Download reports
- See who performed each import
- Reprocess failed imports (future feature)

---

## Validation Rules

### File-Level Validation

✅ File must be valid CSV format  
✅ File must not exceed 10MB  
✅ Must have all required columns  
✅ Column headers must match template exactly  
✅ Maximum 1000 rows per import  

### Row-Level Validation

**Subject & Topic**:
- `subject_id` must exist in database
- `topic_id` must exist in database
- `topic_id` must belong to the specified `subject_id`

**Question Text**:
- Cannot be empty
- Must be between 10 and 2000 characters
- Should end with question mark (warning only)

**Question Type**:
- Must be `multiple_choice`
- Case-insensitive

**Options**:
- All four options (A, B, C, D) are required
- Each option must be 1-500 characters
- Options should be unique (warning only)

**Correct Answer**:
- Must be exactly A, B, C, or D
- Case-insensitive but will be converted to uppercase

**Explanation**:
- Cannot be empty
- Must be at least 10 characters
- Should provide clear reasoning

**Difficulty Level**:
- Must be `beginner`, `intermediate`, or `advanced`
- Case-insensitive

**Tags** (optional):
- Comma-separated list
- Each tag max 50 characters
- Trimmed of whitespace

### Duplicate Detection

The system checks for duplicates:

1. **Within the CSV file**: Same question text appears multiple times
2. **Against database**: Question text already exists for same topic

**Behavior**:
- Duplicates within file: Import fails
- Duplicates in database: You can choose to skip or import anyway (creates a variation)

---

## Common Errors

### 1. Invalid Subject or Topic ID

**Error**: `Invalid subject_id - ID does not exist in database`

**Causes**:
- Copied wrong ID
- Subject/topic was deleted
- Typo in UUID

**Solution**:
```sql
-- Verify the ID exists
SELECT id, name FROM subjects WHERE id = 'YOUR_ID';
SELECT id, name FROM topics WHERE id = 'YOUR_ID';
```

### 2. Missing Required Fields

**Error**: `Missing required field - question_text is empty`

**Causes**:
- Cell left blank
- Extra commas in CSV
- Incorrect delimiters

**Solution**:
- Open CSV in text editor
- Check for empty cells in required columns
- Ensure consistent comma delimiters
- Remove any trailing commas

### 3. Invalid Correct Answer

**Error**: `Invalid correct_answer - Must be A, B, C, or D (got: E)`

**Causes**:
- Typo in answer column
- Used number instead of letter
- Multiple letters entered

**Solution**:
- Use only A, B, C, or D
- Check for extra spaces
- Verify the column has the right value

### 4. Invalid Difficulty Level

**Error**: `Invalid difficulty_level - Must be beginner, intermediate, or advanced (got: easy)`

**Causes**:
- Used synonym (easy, hard, medium)
- Typo in difficulty value
- Different language

**Solution**:
- Use exactly: `beginner`, `intermediate`, or `advanced`
- Check spelling
- Use all lowercase

### 5. File Format Issues

**Error**: `Invalid CSV format`

**Causes**:
- File saved as Excel (.xlsx) instead of CSV
- Incorrect encoding (not UTF-8)
- Special characters causing issues

**Solution**:
- Save as "CSV UTF-8" in Excel
- In Google Sheets: File > Download > CSV
- Use text editor to check for hidden characters

### 6. Topic-Subject Mismatch

**Error**: `topic_id does not belong to specified subject_id`

**Causes**:
- Copied topic ID from different subject
- Mixed up IDs

**Solution**:
```sql
-- Verify topic belongs to subject
SELECT t.id, t.name, t.subject_id, s.name as subject_name
FROM topics t
JOIN subjects s ON t.subject_id = s.id
WHERE t.id = 'YOUR_TOPIC_ID';
```

### 7. Character Encoding Issues

**Error**: Special characters display incorrectly

**Causes**:
- File not saved as UTF-8
- Copy-paste from rich text editor

**Solution**:
- Always save as UTF-8
- Use plain text editor for editing
- Re-download template if corrupted

### 8. Duplicate Questions

**Error**: `Duplicate question detected - Question text already exists`

**Warning**: This is sometimes intentional (question variations)

**Solution**:
- If unintentional: Remove duplicate from CSV
- If intentional: Modify question text slightly or add variations
- Check database for existing questions:
```sql
SELECT id, question_text FROM questions 
WHERE topic_id = 'YOUR_TOPIC_ID' 
AND question_text ILIKE '%search term%';
```

---

## Tips and Best Practices

### Before Import

1. **Start Small**: Test with 5-10 questions first
2. **Verify IDs**: Double-check subject and topic IDs
3. **Use Template**: Always start from downloaded template
4. **Backup Database**: Take backup before large imports
5. **Review Content**: Have someone proofread questions

### During Preparation

1. **Consistent Formatting**: 
   - Use same quotation style
   - Consistent capitalization
   - Uniform punctuation

2. **Quality Over Quantity**:
   - Write clear, unambiguous questions
   - Provide detailed explanations
   - Ensure correct answers are actually correct
   - Make distractors plausible but incorrect

3. **Organize Your Data**:
   - Group questions by topic
   - Sort by difficulty
   - Use meaningful tags
   - Number questions for reference

4. **Use Plain Text**:
   - Avoid rich formatting
   - No bold, italics, colors
   - Use markdown if needed (`*italic*`, `**bold**`)

### During Import

1. **Don't Close Page**: Wait for import to complete
2. **Monitor Progress**: Watch for any errors
3. **Save Report**: Download import report for records
4. **Verify Results**: Check dashboard for updated stats

### After Import

1. **Spot Check**: Verify random questions
2. **Test Questions**: Actually take a practice session
3. **Fix Errors**: Update any incorrect questions
4. **Document**: Note any issues for next import

### Batch Size Recommendations

| Questions | Recommendation | Notes |
|-----------|----------------|-------|
| 1-50 | Single import | Ideal for testing |
| 50-200 | Single import | Standard batch size |
| 200-500 | Single import | Monitor progress carefully |
| 500-1000 | Maximum allowed | Consider splitting |
| 1000+ | Split into multiple files | Required; 1000 is hard limit |

### Common Workflows

**Workflow 1: New Subject Setup**
1. Create subject in admin portal
2. Create topics for subject
3. Download CSV template
4. Fill 10-20 questions per topic
5. Validate and import
6. Verify in question bank
7. Test with practice session

**Workflow 2: Migrating from Another System**
1. Export questions from old system
2. Map columns to SabiPrep template
3. Create subjects/topics in SabiPrep
4. Get new subject/topic IDs
5. Transform data to match template
6. Split into batches of 500
7. Import batch by batch
8. Verify each batch

**Workflow 3: Regular Content Updates**
1. Collect questions over time in spreadsheet
2. When batch reaches 100-200 questions
3. Add subject/topic IDs
4. Validate format matches template
5. Import during low-usage time
6. Review import report
7. Update content calendar

---

## Troubleshooting

### Import Hangs or Times Out

**Symptoms**:
- Progress bar stops moving
- Page becomes unresponsive
- No error message

**Solutions**:
1. Check browser console for errors
2. Verify internet connection
3. Try with smaller batch
4. Check server status
5. Clear browser cache and retry

### Validation Passes But Import Fails

**Symptoms**:
- Validation shows green checkmark
- Import button clicked
- Error occurs during processing

**Possible Causes**:
- Database constraint violation
- Network interruption
- Permission change between validation and import
- Concurrent modification

**Solutions**:
1. Download error report
2. Check specific error messages
3. Verify database state hasn't changed
4. Re-validate and try again
5. Contact administrator if persists

### Questions Import But Don't Appear

**Symptoms**:
- Import report shows success
- Questions not visible in question bank

**Possible Causes**:
- Questions in draft status
- Wrong filter applied
- Browser cache
- Database sync issue

**Solutions**:
```sql
-- Check if questions exist
SELECT COUNT(*) FROM questions 
WHERE topic_id = 'YOUR_TOPIC_ID' 
AND created_at > NOW() - INTERVAL '1 hour';

-- Check question status
SELECT status, COUNT(*) FROM questions 
WHERE topic_id = 'YOUR_TOPIC_ID' 
GROUP BY status;
```

### Special Characters Display Incorrectly

**Symptoms**:
- Accented characters become �
- Quotes become weird symbols
- Formatting breaks

**Solutions**:
1. Save CSV as UTF-8 explicitly
2. In Excel: Save As > More Options > Tools > Web Options > Encoding > UTF-8
3. In Google Sheets: Automatically UTF-8
4. Use text editor to verify encoding
5. Re-import with correct encoding

### Cannot Download Template

**Symptoms**:
- Download button doesn't work
- File downloads as .txt instead of .csv
- Downloaded file is corrupted

**Solutions**:
1. Try different browser
2. Disable browser extensions
3. Check popup blocker
4. Right-click and "Save Link As"
5. Clear browser cache

---

## Advanced Topics

### Custom Validation Rules

If you need custom validation (e.g., institution-specific rules), contact your system administrator to discuss implementing custom validators.

### Bulk Updates

To update existing questions:
1. Export questions to CSV
2. Modify in spreadsheet
3. Currently: Delete old and re-import
4. Future: Update-in-place feature planned

### API Import (for Developers)

Programmatic import via API:

```javascript
// 1. Validate
const formData = new FormData();
formData.append('file', csvFile);

const validateRes = await fetch('/api/admin/import/validate', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});

const { valid, errors } = await validateRes.json();

// 2. Process if valid
if (valid) {
  const processRes = await fetch('/api/admin/import/process', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });
  
  const report = await processRes.json();
  console.log(`Imported ${report.success_count} questions`);
}
```

---

## Appendix

### Quick Reference Card

**Required Columns**: subject_id, topic_id, question_text, question_type, option_a/b/c/d, correct_answer, explanation, difficulty_level

**Valid Values**:
- question_type: `multiple_choice`
- correct_answer: `A`, `B`, `C`, `D`
- difficulty_level: `beginner`, `intermediate`, `advanced`

**Limits**:
- Max file size: 10 MB
- Max rows: 1000
- Question text: 10-2000 chars
- Options: 1-500 chars each
- Explanation: Min 10 chars

### Sample Questions

Download sample question sets:
- Mathematics (100 questions)
- English Language (100 questions)
- Sciences (150 questions)
(Contact administrator for sample files)

### Video Tutorials

(To be added: Link to video walkthrough)

---

## Getting Help

If you need assistance:

1. **Check this guide**: Most issues are covered here
2. **Review validation errors**: They usually indicate the exact problem
3. **Test with template**: Use unmodified template to isolate issues
4. **Check main documentation**: See [ADMIN_PORTAL_README.md](./ADMIN_PORTAL_README.md)
5. **Contact support**: Provide your import report ID

---

*Last Updated: December 2024*
*For SabiPrep Admin Portal Version 1.0.0*
