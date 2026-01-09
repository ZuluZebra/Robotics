# Parent Portal Payment Information - Testing Guide

## Overview

This testing guide will help you verify that the new payment information feature works correctly in the parent portal. All changes have been made and TypeScript compilation has passed successfully.

## Changes Made

### 1. Database Migration
- **File**: `supabase/migrations/005_student_cost_and_banking.sql`
- Added `monthly_cost` field to `students` table
- Added 5 banking detail fields to `schools` table:
  - `bank_name`
  - `account_holder`
  - `account_number`
  - `branch_code`
  - `payment_reference`
- Updated `parent_portal_student_details` view to include all new fields

### 2. TypeScript Types Updated
- `Student` interface: Added `monthly_cost?: number`
- `School` interface: Added banking detail fields
- `ParentPortalData` interface: Added monthly_cost and banking fields

### 3. Admin UI Updates
- **Student Form**: Added "Monthly Cost (ZAR)" input field
- **School Form**: Added "Banking Details" section with all required fields

### 4. Parent Portal UI Update
- **Payment Information Card**: Displays monthly cost and banking details
- Conditional rendering (only shows if data exists)
- Formatted as "R 350.00" for ZAR currency

## Pre-Testing Checklist

- [ ] You have a local development environment set up
- [ ] Supabase is connected and running locally (or using remote instance)
- [ ] Node.js dependencies are installed (`npm install`)
- [ ] TypeScript compilation passes (`npm run type-check`) ✓ Already passed

## Step-by-Step Testing

### Step 1: Apply Database Migration

```bash
# If using local Supabase CLI
supabase migration up

# If using remote Supabase:
# 1. Go to Supabase dashboard
# 2. Navigate to SQL Editor
# 3. Copy the entire content from: supabase/migrations/005_student_cost_and_banking.sql
# 4. Paste and execute
```

**Verification**:
- Check that the students table has a `monthly_cost` column (decimal)
- Check that the schools table has 5 new columns (bank_name, account_holder, account_number, branch_code, payment_reference)

---

### Step 2: Start the Development Server

```bash
npm run dev
```

The app should be available at `http://localhost:3000`

---

### Step 3: Test Admin Flows

#### 3.1 Test Creating a Student with Monthly Cost

1. Navigate to **Admin** → **Students**
2. Click **Add Student**
3. Fill in the form:
   - School: Select any school
   - First Name: "Test"
   - Last Name: "Student"
   - Grade: "10"
   - Monthly Cost (ZAR): **350.00**
   - Leave other fields optional
4. Click **Save Student**

**Expected Result**:
- Student created successfully with message "Student created successfully!"
- Student appears in the students list

#### 3.2 Test Editing a Student's Monthly Cost

1. In the students list, find the student you just created
2. Click the **Edit** (pencil) icon
3. Modify the Monthly Cost field to **400.00**
4. Click **Save Student**

**Expected Result**:
- Student updated successfully
- New monthly cost is visible in the list or details

#### 3.3 Test Creating a School with Banking Details

1. Navigate to **Admin** → **Schools** (or wherever schools are managed)
2. Click **Add School** or **New School**
3. Fill in the form:
   - Name: "Test Robotics Academy"
   - Address: "123 Main Street"
   - Phone: "555-0123"
   - Email: "info@robotics.co.za"
   - Principal Name: "John Doe"
   - **Banking Details Section**:
     - Bank Name: "First National Bank"
     - Account Holder: "Robotics Academy Trust"
     - Account Number: "1234567890"
     - Branch Code: "250655"
     - Payment Reference: "StudentName-Robotics"
4. Click **Save School**

**Expected Result**:
- School created successfully
- Banking details are saved

#### 3.4 Test Editing School Banking Details

1. Find the school you created
2. Click **Edit**
3. Modify banking details (e.g., change account number)
4. Click **Save School**

**Expected Result**:
- School updated successfully
- Banking details are updated

---

### Step 4: Test Parent Portal Display

#### 4.1 Generate Parent Access Link

1. Navigate to **Admin** → **Students**
2. Find a student with:
   - A monthly cost assigned
   - A school with banking details
3. Click the **Share** (share icon) button
4. A modal will appear with a shareable link
5. Copy the link

**Expected Result**:
- Link format: `http://localhost:3000/parent/[uuid-token]`

#### 4.2 View Parent Portal Page

1. Open the copied link in a new browser tab/window
2. You should see:
   - Student header card with name, grade, student ID
   - School Information card
   - Class Information card (if assigned to a class)
   - Teachers card (if assigned teachers)
   - **NEW: Payment Information card** with:
     - Large display of monthly cost: "R 350.00"
     - Banking Details section showing:
       - Bank name
       - Account holder
       - Account number
       - Branch code
       - Payment reference

**Expected Result**:
- All payment information displays correctly
- Formatting is correct (ZAR currency)
- Card only shows if data exists

#### 4.3 Test Edge Cases

**Test Case A**: Student with monthly cost but school without banking details
1. Find/Create a student with monthly_cost = 350.00
2. Ensure their school has no banking details
3. Generate parent link
4. Verify: Payment card displays monthly cost, banking section is hidden

**Test Case B**: Student without monthly cost but school with banking details
1. Find/Create a student with monthly_cost = NULL
2. Ensure their school has banking details
3. Generate parent link
4. Verify: Payment card displays only banking details

**Test Case C**: Student and school with no payment data
1. Find a student with monthly_cost = NULL
2. Ensure their school has no banking details
3. Generate parent link
4. Verify: Payment Information card is NOT displayed

---

### Step 5: Test Existing Functionality

Verify that existing features still work:

- [ ] Parent can view student details (name, grade, DOB, etc.)
- [ ] Parent can view school information
- [ ] Parent can view class schedule and teachers
- [ ] Parent can edit their contact information (name, email, phone)
- [ ] Parent can edit emergency contact information
- [ ] Parent can edit medical notes
- [ ] Student details modal opens correctly in admin
- [ ] Student edit form displays correctly
- [ ] No console errors when loading parent portal

---

### Step 6: Verify TypeScript Compilation

```bash
npm run type-check
```

**Expected Result**: No errors (should complete silently)

---

## Testing Checklist

### Admin Tests
- [ ] Create student with monthly cost
- [ ] Edit student monthly cost
- [ ] Create school with banking details
- [ ] Edit school banking details
- [ ] Admin pages load without errors
- [ ] Form validation works

### Parent Portal Tests
- [ ] Generate parent access link
- [ ] View Payment Information card with monthly cost
- [ ] View Payment Information card with banking details
- [ ] Monthly cost displays as "R XXX.XX"
- [ ] Banking details display correctly
- [ ] Payment card hidden when no data exists
- [ ] Parent can still edit personal information
- [ ] Existing functionality still works
- [ ] No console errors

### Database Tests
- [ ] Migration applied successfully
- [ ] New columns exist in students table
- [ ] New columns exist in schools table
- [ ] Parent portal view returns correct data
- [ ] Data persists after refresh

---

## Common Issues & Solutions

### Issue: "Column does not exist" error

**Solution**: Verify the migration was applied:
```sql
-- Check students table
SELECT column_name FROM information_schema.columns
WHERE table_name='students' AND column_name='monthly_cost';

-- Check schools table
SELECT column_name FROM information_schema.columns
WHERE table_name='schools' AND column_name='bank_name';
```

### Issue: Parent portal shows blank payment card

**Possible causes**:
- Monthly cost is 0 (change to a value > 0)
- School has no banking details
- Data not saved properly

**Solution**: Check that the student's monthly_cost and school's banking details are actually saved in the database.

### Issue: TypeScript errors during build

**Solution**: Run type check:
```bash
npm run type-check
```

All changes should pass the type check.

---

## Local Testing Workflow

1. Apply migration
2. Start dev server (`npm run dev`)
3. Test admin flows (create/edit student and school)
4. Test parent portal (generate links, view payment info)
5. Test edge cases
6. Verify no console errors
7. Run type check
8. If all tests pass, you're ready to commit!

---

## Ready to Commit?

Once you've completed all testing steps and everything passes:

```bash
git add .
git commit -m "Add payment information to parent portal"
git push
```

**Important**: Make sure you've tested everything locally before pushing, since there were build errors in previous parent portal work.

---

## Files Modified

- `supabase/migrations/005_student_cost_and_banking.sql` (NEW)
- `src/types/models.ts`
- `src/app/actions/parent-portal.ts`
- `src/components/admin/student-form.tsx`
- `src/components/admin/school-form.tsx`
- `src/app/parent/[token]/page.tsx`

## Support

If you encounter any issues:
1. Check the console for error messages
2. Verify the database migration was applied
3. Ensure all TypeScript types are correct
4. Check that Supabase is properly connected
