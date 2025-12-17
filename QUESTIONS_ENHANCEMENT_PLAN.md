# Questions Table Enhancement Plan
## Comprehension Passages & Images Support

**Date:** December 17, 2024  
**Status:** Planning Phase  
**Version:** 1.0

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Database Schema Design](#database-schema-design)
4. [Implementation Plan](#implementation-plan)
5. [CSV Import Updates](#csv-import-updates)
6. [API Modifications](#api-modifications)
7. [Frontend Changes](#frontend-changes)
8. [Migration Strategy](#migration-strategy)
9. [Testing Requirements](#testing-requirements)
10. [Timeline & Phases](#timeline--phases)

---

## Executive Summary

### Objective
Enhance the questions table to fully support:
1. **Comprehension passages** - Short passages for English/Reading questions
2. **Images/Diagrams** - Visual content for Mathematics, Sciences, etc.

### Key Findings
- ✅ **Passages are ALREADY supported** in database and types
- ⚠️ **Images are PARTIALLY supported** - needs enhancement
- 🔧 **UI components need updates** for consistent display
- 📝 **CSV import needs passage support**

### Scope
This is primarily an **enhancement and completion** project, not a greenfield implementation.

---

## Current State Analysis

### 1. Database Schema (✅ Mostly Complete)

**Existing Support in [`questions`](supabase/migrations/20231216_initial_schema.sql:60-78) table:**

```sql
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_image_url TEXT,              -- ✅ EXISTS
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer TEXT NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
  explanation TEXT,
  hint TEXT,
  difficulty TEXT CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  exam_type TEXT,
  exam_year INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**What's Missing:**
- ❌ `passage` column (for comprehension text)
- ❌ `passage_id` column (for grouping questions by passage)
- ❌ Image metadata (alt text, dimensions, file size)
- ❌ Support for option E (5th option)

### 2. TypeScript Types (✅ Partially Complete)

**Current [`Question`](types/database.ts:87-111) interface:**

```typescript
export interface Question {
  id: string;
  subject_id: string;
  topic_id: string;
  question_text: string;
  passage?: string;                    // ✅ EXISTS
  question_image_url?: string;         // ✅ EXISTS
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  option_e?: string;                   // ✅ EXISTS
  correct_answer: 'A' | 'B' | 'C' | 'D' | 'E';
  explanation?: string;
  hint?: string;
  solution?: string;
  further_study_links?: string[];
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  exam_type?: string;
  exam_year?: number;
  status: QuestionStatus;
  created_by?: string;
  created_at: string;
  updated_at: string;
}
```

**What's Missing:**
- ❌ `passage_id` for grouping
- ❌ Image metadata fields
- ❌ `image_alt_text` for accessibility

### 3. UI Components Status

| Component | Passage Support | Image Support | Status |
|-----------|----------------|---------------|---------|
| [`QuestionForm`](components/admin/QuestionForm.tsx:29-48) | ✅ Has field | ❌ No upload | Needs image upload |
| [`QuestionPreview`](components/admin/QuestionPreview.tsx:8-25) | ✅ Displays | ❌ No display | Needs image display |
| [`Practice Mode`](app/(learning)/practice/[sessionId]/page.tsx:220-233) | ❌ Not shown | ✅ Displays | Needs passage display |
| [`Test Mode`](app/(learning)/test/[sessionId]/page.tsx:219-232) | ❌ Not shown | ✅ Displays | Needs passage display |
| Admin Question List | ❌ Not shown | ❌ Not shown | Needs both |

### 4. CSV Import Status

**Current CSV Template Columns:**
```csv
subject_id,topic_id,question_text,question_image_url,question_type,
option_a,option_b,option_c,option_d,correct_answer,explanation,
difficulty_level,tags
```

**What's Missing:**
- ❌ `passage` column
- ❌ `passage_id` column for grouping
- ❌ Image upload support (only URLs currently)
- ❌ `image_alt_text` column

### 5. API Endpoints Status

**[`POST /api/admin/questions`](app/api/admin/questions/route.ts:169-376):**
- ✅ Accepts `passage` field
- ❌ No image upload handling
- ❌ No passage grouping logic

**[`GET /api/admin/questions`](app/api/admin/questions/route.ts:15-163):**
- ✅ Returns `passage` field
- ✅ Returns `question_image_url`
- ❌ No passage grouping in response

---

## Database Schema Design

### Enhanced Questions Table

#### New/Modified Columns

```sql
-- Migration: 20241217_enhance_questions_table.sql

-- Add passage column (if not exists)
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS passage TEXT;

-- Add passage_id for grouping questions
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS passage_id UUID;

-- Add image metadata
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS image_alt_text TEXT;

ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS image_width INTEGER;

ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS image_height INTEGER;

-- Update correct_answer constraint to include E
ALTER TABLE public.questions 
DROP CONSTRAINT IF EXISTS questions_correct_answer_check;

ALTER TABLE public.questions 
ADD CONSTRAINT questions_correct_answer_check 
CHECK (correct_answer IN ('A', 'B', 'C', 'D', 'E'));

-- Add option_e if not exists
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS option_e TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_questions_passage_id 
ON public.questions(passage_id) 
WHERE passage_id IS NOT NULL;

-- Add comments
COMMENT ON COLUMN public.questions.passage IS 
'Comprehension passage text for English/Reading questions';

COMMENT ON COLUMN public.questions.passage_id IS 
'Groups multiple questions that share the same passage';

COMMENT ON COLUMN public.questions.image_alt_text IS 
'Accessibility text describing the image content';
```

### Complete Enhanced Schema

```sql
CREATE TABLE IF NOT EXISTS public.questions (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Classification
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  
  -- Content
  question_text TEXT NOT NULL,
  passage TEXT,                          -- NEW: Comprehension passage
  passage_id UUID,                       -- NEW: Groups questions by passage
  
  -- Images
  question_image_url TEXT,               -- EXISTING: Image URL
  image_alt_text TEXT,                   -- NEW: Accessibility text
  image_width INTEGER,                   -- NEW: Image dimensions
  image_height INTEGER,                  -- NEW: Image dimensions
  
  -- Options (A-E)
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT,
  option_d TEXT,
  option_e TEXT,                         -- EXISTING: 5th option
  
  -- Answer & Explanation
  correct_answer TEXT NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D', 'E')),
  explanation TEXT,
  hint TEXT,
  solution TEXT,                         -- EXISTING: Detailed solution
  further_study_links TEXT[],            -- EXISTING: Additional resources
  
  -- Metadata
  difficulty TEXT CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  exam_type TEXT,
  exam_year INTEGER,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  
  -- Audit
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Image Storage Strategy

**Recommended Approach: Supabase Storage**

```typescript
// Storage bucket structure
sabiprep-images/
├── questions/
│   ├── {question_id}/
│   │   ├── main.jpg          // Main question image
│   │   ├── diagram.png       // Additional diagrams
│   │   └── thumbnail.jpg     // Thumbnail for lists
├── passages/
│   └── {passage_id}/
│       └── illustration.jpg  // Passage illustrations
└── options/
    └── {question_id}/
        ├── option_a.jpg      // Image options
        └── option_b.jpg
```

**Benefits:**
- ✅ Integrated with Supabase
- ✅ Built-in CDN
- ✅ Access control via RLS
- ✅ Automatic image optimization
- ✅ Signed URLs for security

**Alternative: External URLs**
- Keep `question_image_url` for external images
- Support both storage bucket and external URLs
- Validate URLs during import

---

## Implementation Plan

### Phase 1: Database Migration (Week 1)

#### Tasks:
1. **Create migration script** for new columns
2. **Update RLS policies** for image access
3. **Create storage bucket** for question images
4. **Set up storage policies** for upload/download
5. **Test migration** on development database

#### Deliverables:
- ✅ Migration script: `20241217_enhance_questions_table.sql`
- ✅ Storage bucket: `question-images`
- ✅ RLS policies updated
- ✅ Rollback script prepared

### Phase 2: TypeScript Types Update (Week 1)

#### Tasks:
1. **Update [`Question`](types/database.ts:87-111) interface**
2. **Update [`QuestionFormData`](components/admin/QuestionForm.tsx:29-48) interface**
3. **Create image metadata types**
4. **Update API request/response types**

#### Code Changes:

```typescript
// types/database.ts - Enhanced Question interface
export interface Question {
  // ... existing fields ...
  
  // Passage support
  passage?: string;
  passage_id?: string;
  
  // Enhanced image support
  question_image_url?: string;
  image_alt_text?: string;
  image_width?: number;
  image_height?: number;
  
  // ... rest of fields ...
}

// New: Image metadata type
export interface QuestionImage {
  url: string;
  alt_text: string;
  width?: number;
  height?: number;
  file_size?: number;
  mime_type?: string;
}

// New: Passage grouping type
export interface PassageGroup {
  passage_id: string;
  passage_text: string;
  questions: Question[];
  created_at: string;
}
```

### Phase 3: Backend API Updates (Week 2)

#### 3.1 Image Upload Endpoint

**New endpoint:** `POST /api/admin/questions/upload-image`

```typescript
// app/api/admin/questions/upload-image/route.ts
import { createServerClient } from '@/lib/supabaseServer';

export async function POST(request: NextRequest) {
  return withAdminAuth(request, async (adminUser, req) => {
    const formData = await req.formData();
    const file = formData.get('image') as File;
    const altText = formData.get('alt_text') as string;
    
    // Validate file
    if (!file || !file.type.startsWith('image/')) {
      return createErrorResponse(400, 'Invalid file', 'Must be an image');
    }
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return createErrorResponse(400, 'File too large', 'Max 5MB');
    }
    
    const supabase = createServerClient();
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = `questions/${fileName}`;
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('question-images')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false
      });
    
    if (error) {
      return createErrorResponse(500, 'Upload failed', error.message);
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('question-images')
      .getPublicUrl(filePath);
    
    return createSuccessResponse({
      url: publicUrl,
      alt_text: altText,
      file_name: fileName,
      file_size: file.size,
      mime_type: file.type
    });
  });
}
```

#### 3.2 Update Question CRUD Endpoints

**Modify:** [`POST /api/admin/questions`](app/api/admin/questions/route.ts:169-376)

```typescript
// Add passage and image fields to validation
const {
  // ... existing fields ...
  passage,
  passage_id,
  question_image_url,
  image_alt_text,
  image_width,
  image_height,
} = body;

// Validate image alt text if image provided
if (question_image_url && !image_alt_text) {
  return createErrorResponse(
    400, 
    'Bad Request', 
    'Alt text required for accessibility when image is provided'
  );
}

// Insert with new fields
const { data: newQuestion, error } = await supabase
  .from('questions')
  .insert({
    // ... existing fields ...
    passage: passage?.trim() || null,
    passage_id: passage_id || null,
    question_image_url: question_image_url?.trim() || null,
    image_alt_text: image_alt_text?.trim() || null,
    image_width: image_width ? parseInt(image_width, 10) : null,
    image_height: image_height ? parseInt(image_height, 10) : null,
  });
```

#### 3.3 Passage Grouping Endpoint

**New endpoint:** `GET /api/admin/questions/by-passage/:passageId`

```typescript
// Get all questions for a specific passage
export async function GET(
  request: NextRequest,
  { params }: { params: { passageId: string } }
) {
  return withAdminAuth(request, async () => {
    const supabase = createServerClient();
    
    const { data: questions, error } = await supabase
      .from('questions')
      .select('*')
      .eq('passage_id', params.passageId)
      .order('created_at', { ascending: true });
    
    if (error) {
      return createErrorResponse(500, 'Database Error', error.message);
    }
    
    return createSuccessResponse({ questions });
  });
}
```

### Phase 4: CSV Import Enhancement (Week 2-3)

#### 4.1 Updated CSV Template

**New columns:**

```csv
subject_id,topic_id,passage,passage_id,question_text,question_image_url,
image_alt_text,option_a,option_b,option_c,option_d,option_e,correct_answer,
explanation,hint,solution,difficulty,exam_type,exam_year,status
```

#### 4.2 CSV Import Examples

**Example 1: Comprehension Questions (Shared Passage)**

```csv
subject_id,topic_id,passage,passage_id,question_text,question_image_url,image_alt_text,option_a,option_b,option_c,option_d,option_e,correct_answer,explanation,hint,solution,difficulty,exam_type,exam_year,status
abc-123,def-456,"The sun was setting over the horizon, painting the sky in shades of orange and pink. Birds flew homeward in V-formations, their silhouettes dark against the colorful backdrop.",pass-001,"What time of day is described in the passage?",,,"Morning","Afternoon","Evening","Night",,C,"The passage mentions 'sun was setting' which indicates evening time.","Look for time indicators in the text.","The phrase 'sun was setting' clearly indicates the evening/dusk time period.",Easy,WAEC,2023,published
abc-123,def-456,"The sun was setting over the horizon, painting the sky in shades of orange and pink. Birds flew homeward in V-formations, their silhouettes dark against the colorful backdrop.",pass-001,"What colors are mentioned in the sky?",,,"Red and blue","Orange and pink","Yellow and purple","Green and white",,B,"The passage explicitly states 'orange and pink'.","Read the description of the sky carefully.","Direct quote from passage: 'painting the sky in shades of orange and pink'.",Easy,WAEC,2023,published
```

**Example 2: Mathematics with Diagram**

```csv
subject_id,topic_id,passage,passage_id,question_text,question_image_url,image_alt_text,option_a,option_b,option_c,option_d,option_e,correct_answer,explanation,hint,solution,difficulty,exam_type,exam_year,status
xyz-789,ghi-012,,,Calculate the area of the triangle shown in the diagram.,https://storage.supabase.co/diagrams/triangle-abc.png,"Right-angled triangle ABC with base 6cm and height 8cm","24 cm²","48 cm²","30 cm²","36 cm²",,A,"Area of triangle = ½ × base × height = ½ × 6 × 8 = 24 cm²","Remember the formula for triangle area.","Step 1: Identify base = 6cm and height = 8cm\nStep 2: Apply formula: Area = ½ × b × h\nStep 3: Calculate: ½ × 6 × 8 = 24 cm²",Medium,JAMB,2023,published
```

**Example 3: Question with 5 Options**

```csv
subject_id,topic_id,passage,passage_id,question_text,question_image_url,image_alt_text,option_a,option_b,option_c,option_d,option_e,correct_answer,explanation,hint,solution,difficulty,exam_type,exam_year,status
lmn-345,opq-678,,,Which of the following is NOT a primary color?,,,Red,Blue,Yellow,Green,Purple,D,"Primary colors are red, blue, and yellow. Green is a secondary color.","Think about colors that cannot be made by mixing.","Primary colors: Red, Blue, Yellow\nSecondary colors: Green (Blue+Yellow), Orange (Red+Yellow), Purple (Red+Blue)\nTherefore, Green is NOT a primary color.",Easy,NECO,2023,published
```

#### 4.3 Validation Rules Update

**Add to [`CSV_IMPORT_GUIDE.md`](CSV_IMPORT_GUIDE.md):**

```markdown
### Passage Validation Rules

**Passage Field:**
- Optional (can be empty)
- Max 5000 characters
- Should be plain text (no HTML)
- Multiple questions can share same passage via `passage_id`

**Passage ID:**
- Optional UUID format
- Use same ID for questions sharing a passage
- Auto-generated if passage provided but no ID given
- Must be consistent across related questions

**Image Validation Rules:**

**question_image_url:**
- Optional URL or Supabase storage path
- Must be valid URL format
- Supported formats: JPG, PNG, GIF, SVG, WebP
- Max file size: 5MB (if uploading)
- External URLs must be HTTPS

**image_alt_text:**
- Required if `question_image_url` is provided
- Min 10 characters, max 200 characters
- Should describe image content for accessibility
- Example: "Right-angled triangle with sides labeled 3cm, 4cm, 5cm"
```

#### 4.4 Import Processing Logic

```typescript
// lib/csv-import-processor.ts

interface CSVRow {
  passage?: string;
  passage_id?: string;
  question_image_url?: string;
  image_alt_text?: string;
  // ... other fields
}

async function processCSVImport(rows: CSVRow[]) {
  const passageGroups = new Map<string, string>();
  
  for (const row of rows) {
    // Handle passage grouping
    if (row.passage && !row.passage_id) {
      // Generate passage_id if not provided
      const passageHash = generatePassageHash(row.passage);
      
      if (!passageGroups.has(passageHash)) {
        passageGroups.set(passageHash, uuid());
      }
      
      row.passage_id = passageGroups.get(passageHash);
    }
    
    // Validate image alt text
    if (row.question_image_url && !row.image_alt_text) {
      throw new ValidationError(
        `Row ${row.rowNumber}: Alt text required for image accessibility`
      );
    }
    
    // Process row...
  }
}
```

### Phase 5: Frontend Updates (Week 3-4)

#### 5.1 Admin Question Form Enhancement

**Update [`QuestionForm`](components/admin/QuestionForm.tsx):**

```typescript
// Add image upload state
const [imageFile, setImageFile] = useState<File | null>(null);
const [imagePreview, setImagePreview] = useState<string | null>(null);
const [isUploadingImage, setIsUploadingImage] = useState(false);

// Image upload handler
async function handleImageUpload(file: File) {
  setIsUploadingImage(true);
  
  const formData = new FormData();
  formData.append('image', file);
  formData.append('alt_text', formData.image_alt_text || '');
  
  const response = await fetch('/api/admin/questions/upload-image', {
    method: 'POST',
    body: formData,
  });
  
  const data = await response.json();
  
  if (response.ok) {
    setFormData(prev => ({
      ...prev,
      question_image_url: data.url,
      image_alt_text: data.alt_text,
    }));
  }
  
  setIsUploadingImage(false);
}
```

**Add image upload UI:**

```tsx
{/* Image Upload Section */}
<div className="space-y-4">
  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
    Image/Diagram (Optional)
  </h3>
  
  {/* Image Upload */}
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      Upload Image
    </label>
    
    {!formData.question_image_url ? (
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImageUpload(file);
          }}
          className="hidden"
          id="image-upload"
        />
        <label
          htmlFor="image-upload"
          className="cursor-pointer text-emerald-600 hover:text-emerald-700"
        >
          Click to upload or drag and drop
        </label>
        <p className="text-xs text-gray-500 mt-1">
          PNG, JPG, GIF up to 5MB
        </p>
      </div>
    ) : (
      <div className="relative">
        <img
          src={formData.question_image_url}
          alt={formData.image_alt_text || 'Question image'}
          className="max-w-full h-auto rounded-lg border border-gray-200"
        />
        <button
          type="button"
          onClick={() => setFormData(prev => ({
            ...prev,
            question_image_url: '',
            image_alt_text: '',
          }))}
          className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    )}
  </div>
  
  {/* Alt Text */}
  {formData.question_image_url && (
    <div>
      <label htmlFor="image_alt_text" className="block text-sm font-medium text-gray-700 mb-1">
        Image Description (Alt Text) <span className="text-red-500">*</span>
      </label>
      <input
        type="text"
        id="image_alt_text"
        name="image_alt_text"
        value={formData.image_alt_text}
        onChange={handleChange}
        placeholder="Describe the image for accessibility..."
        className="w-full px-3 py-2 border border-gray-200 rounded-lg"
      />
      <p className="mt-1 text-xs text-gray-500">
        Required for accessibility. Describe what's shown in the image.
      </p>
    </div>
  )}
</div>
```

#### 5.2 Student Interface Updates

**Update [`Practice Mode`](app/(learning)/practice/[sessionId]/page.tsx):**

```tsx
{/* Add Passage Display */}
{currentQuestion.passage && (
  <Card className="bg-blue-50 border-2 border-blue-200 mb-4">
    <div className="flex gap-3">
      <BookOpen className="w-6 h-6 text-blue-600 flex-shrink-0" />
      <div>
        <p className="font-semibold text-gray-900 mb-2">Passage:</p>
        <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
          {currentQuestion.passage}
        </p>
      </div>
    </div>
  </Card>
)}

{/* Enhanced Image Display */}
{currentQuestion.question_image_url && (
  <div className="mb-4">
    <img
      src={currentQuestion.question_image_url}
      alt={currentQuestion.image_alt_text || 'Question diagram'}
      className="max-w-full h-auto rounded-lg border border-gray-200 shadow-sm"
      loading="lazy"
    />
    {currentQuestion.image_alt_text && (
      <p className="text-xs text-gray-500 mt-1 italic">
        {currentQuestion.image_alt_text}
      </p>
    )}
  </div>
)}
```

**Update [`Test Mode`](app/(learning)/test/[sessionId]/page.tsx):** (Same changes as Practice Mode)

#### 5.3 Admin Question List

**Add passage indicator:**

```tsx
{/* Question List Item */}
<div className="flex items-start gap-3">
  <div className="flex-1">
    <p className="font-medium text-gray-900">{question.question_text}</p>
    
    {/* Indicators */}
    <div className="flex gap-2 mt-2">
      {question.passage && (
        <Badge variant="info" size="sm">
          <BookOpen className="w-3 h-3 mr-1" />
          Has Passage
        </Badge>
      )}
      {question.question_image_url && (
        <Badge variant="neutral" size="sm">
          <Image className="w-3 h-3 mr-1" />
          Has Image
        </Badge>
      )}
    </div>
  </div>
</div>
```

---

## CSV Import Updates

### Updated Template Download

**Modify:** `app/api/admin/import/template/route.ts`

```typescript
const headers = [
  'subject_id',
  'topic_id',
  'passage',              // NEW
  'passage_id',           // NEW
  'question_text',
  'question_image_url',
  'image_alt_text',       // NEW
  'option_a',
  'option_b',
  'option_c',
  'option_d',
  'option_e',
  'correct_answer',
  'explanation',
  'hint',
  'solution',
  'difficulty',
  'exam_type',
  'exam_year',
  'status'
];

const exampleRow = [
  'abc-123-def',
  'xyz-789-ghi',
  'The quick brown fox jumps over the lazy dog. This sentence contains every letter of the alphabet.',
  'pass-001',
  'How many letters are in the English alphabet?',
  'https://example.com/alphabet.png',
  'Chart showing all 26 letters of the English alphabet',
  '24',
  '25',
  '26',
  '27',
  '',
  'C',
  'The English alphabet has 26 letters from A to Z.',
  'Count from A to Z',
  'The standard English alphabet consists of 26 letters: A through Z.',
  'Easy',
  'WAEC',
  '2023',
  'published'
];
```

### Validation Updates

**Modify:** `app/api/admin/import/validate/route.ts`

```typescript
// Add passage validation
if (row.passage && row.passage.length > 5000) {
  errors.push({
    row: rowIndex,
    column: 'passage',
    message: 'Passage exceeds maximum length of 5000 characters',
    value: row.passage.substring(0, 50) + '...'
  });
}

// Validate image alt text
if (row.question_image_url && !row.image_alt_text) {
  errors.push({
    row: rowIndex,
    column: 'image_alt_text',
    message: 'Alt text required when image URL is provided (accessibility)',
    value: row.question_image_url
  });
}

if (row.image_alt_text && row.image_alt_text.length < 10) {
  errors.push({
    row: rowIndex,
    column: 'image_alt_text',
    message: 'Alt text must be at least 10 characters for meaningful description',
    value: row.image_alt_text
  });
}
```

---

## Migration Strategy

### Backward Compatibility

**Existing questions will:**
- ✅ Continue to work without passages
- ✅ Continue to work without images
- ✅ Display correctly in all interfaces
- ✅ Import/export without new fields

**Migration approach:**
1. **Additive only** - No breaking changes
2. **Optional fields** - All new columns nullable
3. **Default values** - Sensible defaults for new fields
4. **Gradual rollout** - Enable features incrementally

### Data Migration Script

```sql
-- Migration for existing data
-- Run after schema changes

-- 1. Set default status for questions without status
UPDATE public.questions 
SET status = 'published' 
WHERE status IS NULL;

-- 2. Generate passage_ids for questions with passages
WITH passage_questions AS (
  SELECT id, passage, 
         MD5(passage) as passage_hash
  FROM public.questions 
  WHERE passage IS NOT NULL 
    AND passage_id IS NULL
)
UPDATE public.questions q
SET passage_id = uuid_generate_v5(
  uuid_ns_url(), 
  pq.passage_hash
)
FROM passage_questions pq
WHERE q.id = pq.id;

-- 3. Add default alt text for existing images
UPDATE public.questions 
SET image_alt_text = 'Question diagram or illustration'
WHERE question_image_url IS NOT NULL 
  AND image_alt_text IS NULL;
```

### Rollback Plan

```sql
-- Rollback script if needed
-- Remove new columns (data will be lost!)

ALTER TABLE public.questions 
DROP COLUMN IF EXISTS passage_id;

ALTER TABLE public.questions 
DROP COLUMN IF EXISTS image_alt_text;

ALTER TABLE public.questions 
DROP COLUMN IF EXISTS image_width;

ALTER TABLE public.questions 
DROP COLUMN IF EXISTS image_height;

-- Restore old constraint
ALTER TABLE public.questions 
DROP CONSTRAINT IF EXISTS questions_correct_answer_check;

ALTER TABLE public.questions 
ADD CONSTRAINT questions_correct_answer_check 
CHECK (correct_answer IN ('A', 'B', 'C', 'D'));
```

---

## Testing Requirements

### Unit Tests

```typescript
// tests/questions/passage-grouping.test.ts
describe('Passage Grouping', () => {
  it('should group questions by passage_id', async () => {
    const questions = await getQuestionsByPassage('pass-001');
    expect(questions).toHaveLength(2);
    expect(questions[0].passage_id).toBe('pass-001');
  });
  
  it('should generate passage_id if not provided', async () => {
    const question = await createQuestion({
      passage: 'Test passage',
      // passage_id not provided
    });
    expect(question.passage_id).toBeDefined();
  });
});

// tests/questions/image-upload.test.ts
describe('Image Upload', () => {
  it('should upload image to storage', async () => {
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const result = await uploadQuestionImage(file, 'Test alt text');
    expect(result.url).toContain('supabase.co');
  });
  
  it('should reject files over 5MB', async () => {
    const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg');
    await expect(uploadQuestionImage(largeFile)).rejects.toThrow('File too large');
  });
  
  it('should require alt text', async () => {
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    await expect(uploadQuestionImage(file, '')).rejects.toThrow('Alt text required');
  });
});
```

### Integration Tests

```typescript
// tests/integration/csv-import.test.ts
describe('CSV Import with Passages', () => {
  it('should import questions with shared passage', async () => {
    const csv = `
subject_id,topic_id,passage,passage_id,question_text,...
abc,def,"Shared passage",pass-1,"Question 1",...
abc,def,"Shared passage",pass-1,"Question 2",...
    `;
    
    const result = await importCSV(csv);
    expect(result.success_count).toBe(2);
    
    const questions = await getQuestionsByPassage('pass-1');
    expect(questions).toHaveLength(2);
    expect(questions[0].passage).toBe(questions[1].passage);
  });
});
```

### Manual Testing Checklist

- [ ] Create question with passage in admin form
- [ ] Create question with image upload
- [ ] Create multiple questions sharing same passage
- [ ] View passage in practice mode
- [ ] View passage in test mode
- [ ] Import CSV with passages
- [ ] Import CSV with images
- [ ] Verify image accessibility (screen reader)
- [ ] Test image lazy loading
- [ ] Test on mobile devices
- [ ] Test with slow network (image loading)
- [ ] Verify backward compatibility with old questions

---

## Timeline & Phases

### Phase 1: Foundation (Week 1)
**Duration:** 5 days  
**Focus:** Database & Types

- [ ] Day 1-2: Database migration script
- [ ] Day 2-3: TypeScript types update
- [ ] Day 3-4: Storage bucket setup
- [ ] Day 4-5: Testing & validation

**Deliverables:**
- Migration script
- Updated types
- Storage bucket configured
- Unit tests passing

### Phase 2: Backend (Week 2)
**Duration:** 5 days  
**Focus:** API Endpoints

- [ ] Day 1-2: Image upload endpoint
- [ ] Day 2-3: Update CRUD endpoints
- [ ] Day 3-4: Passage grouping logic
- [ ] Day 4-5: API testing

**Deliverables:**
- Image upload working
- Questions API updated
- Passage grouping functional
- Integration tests passing

### Phase 3: CSV Import (Week 2-3)
**Duration:** 5 days  
**Focus:** Import System

- [ ] Day 1-2: Update CSV template
- [ ] Day 2-3: Validation rules
- [ ] Day 3-4: Import processing
- [ ] Day 4-5: Testing & examples

**Deliverables:**
- New CSV template
- Validation working
- Import examples documented
- Import tests passing

### Phase 4: Frontend (Week 3-4)
**Duration:** 7 days  
**Focus:** UI Components

- [ ] Day 1-3: Admin question form
- [ ] Day 3-5: Student interfaces
- [ ] Day 5-6: Admin question list
- [ ] Day 6-7: Polish & responsive

**Deliverables:**
- Image upload UI
- Passage display in all modes
- Admin list updated
- Mobile responsive

### Phase 5: Testing & Launch (Week 4)
**Duration:** 3 days  
**Focus:** QA & Deployment

- [ ] Day 1: Full system testing
- [ ] Day 2: Bug fixes
- [ ] Day 3: Production deployment

**Deliverables:**
- All tests passing
- Documentation complete
- Production deployed
- User guide updated

---

## Success Criteria

### Must Have (P0)
- ✅ Passages display correctly in student interfaces
- ✅ Images upload and display with alt text
- ✅ CSV import supports passages and images
- ✅ Backward compatibility maintained
- ✅ Accessibility requirements met (WCAG 2.1 AA)

### Should Have (P1)
- ✅ Passage grouping works correctly
- ✅ Image optimization and lazy loading
- ✅ Admin can preview passages and images
- ✅ Mobile responsive design

### Nice to Have (P2)
- ⭕ Bulk image upload
- ⭕ Image editing/cropping
- ⭕ Passage templates
- ⭕ Image gallery/library

---

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Storage costs increase | Medium | High | Implement image compression, set size limits |
| Image loading slow | High | Medium | Use CDN, lazy loading, thumbnails |
| Alt text quality poor | Medium | High | Validation rules, examples, guidelines |
| Passage grouping bugs | Medium | Low | Thorough testing, clear documentation |
| CSV import complexity | Low | Medium | Good examples, validation feedback |
| Backward compatibility | High | Low | Additive changes only, extensive testing |

---

## Appendix

### A. Complete Field Reference

| Field | Type | Required | Max Length | Description |
|-------|------|----------|------------|-------------|
| `passage` | TEXT | No | 5000 | Comprehension passage text |
| `passage_id` | UUID | No | - | Groups questions by passage |
| `question_image_url` | TEXT | No | 500 | Image URL or storage path |
| `image_alt_text` | TEXT | Conditional* | 200 | Accessibility description |
| `image_width` | INTEGER | No | - | Image width in pixels |
| `image_height` | INTEGER | No | - | Image height in pixels |
| `option_e` | TEXT | No | 500 | Fifth answer option |

*Required if `question_image_url` is provided

### B. CSV Import Examples Repository

See separate file: `CSV_IMPORT_EXAMPLES.md` (to be created)

### C. Image Guidelines

**Recommended Specifications:**
- Format: JPG for photos, PNG for diagrams
- Max size: 5MB
- Recommended width: 800-1200px
- Aspect ratio: Maintain original
- Compression: 80-85% quality

**Alt Text Guidelines:**
- Be specific and descriptive
- Mention key details (measurements, labels)
- Keep under 200 characters
- Don't start with "Image of..." or "Picture of..."
- Example: "Right triangle ABC with base 6cm, height 8cm, hypotenuse 10cm"

### D. Accessibility Checklist

- [ ] All images have meaningful alt text
- [ ] Alt text describes content, not appearance
- [ ] Images don't convey information not in text
- [ ] Color is not the only means of conveying information
- [ ] Text in images is also available as actual text
- [ ] Images load with proper dimensions (no layout shift)
- [ ] Keyboard navigation works with image modals

---

## Questions & Clarifications Needed

1. **Image Storage:** Confirm Supabase Storage vs external CDN preference?
2. **Passage Length:** Is 5000 characters sufficient for longest passages?
3. **Image Formats:** Should we support SVG for mathematical diagrams?
4. **Bulk Operations:** Priority for bulk image upload feature?
5. **Mobile Upload:** Should mobile app support image upload from camera?

---

**Document Version:** 1.0  
**Last Updated:** December 17, 2024  
**Next Review:** After Phase 1 completion  
**Owner:** Development Team  
**Stakeholders:** Admin Users, Content Creators, Students