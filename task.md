Airbnb Clone Master Task List
Phase 10: UI/UX Refinement & Polish (Carryover - Priority)
 Toast Notifications (Chakra v3)
- [x] Integrate toaster into `app/routes/login.tsx` (using useEffect for server actions)
- [x] Verify Toast notifications (Login, Sign up)
 Loading States
 Implement Skeleton loaders for Home (Room Grid)
 Implement Skeleton loaders for Room Details
 Implement Skeleton loaders for Admin Tables
 Responsive Design
- [x] Verify and fix Mobile View for Home & Room Detail
- [x] Ensure Navigation and Footer are mobile-friendly
✅ User Verification Checklist (Phase 10)
 Toast Test: Try logging in with wrong password -> See Error Toast. Try booking -> See Success Toast.
 Skeleton Test: Throttle network to "Slow 3G" in DevTools -> Reload Home -> Verify Skeleton UI appears before content.
 Mobile Test: Resize browser to 375px width -> Check Navigation menu (Hamburger?) and Room Grid alignment (1 column).
Phase 11: Core Feature Gaps (Admin & Registration)
 Admin Panel Enhancements (Frontend)
- [x] Amenity Management: List View, Create/Delete/Edit functionality
- [x] Category Management: List View, Create/Delete/Edit functionality
- [x] User Management: User List, Role Management (Promote to Host/Admin)
 Dashboard: Booking Statistics, Revenue Charts
 Room Registration Improvements
- [x] Photo Upload Integration: Combine "Create Room" and "Photo Upload" into one flow
- [x] Wizard UI: Implement multi-step form for better UX
- [x] Real-time Validation: Improve form feedback
✅ User Verification Checklist (Phase 11)
 Admin CRUD Test: Go to /admin/amenities -> Add "Test Amenity" -> Check if it appears in list -> Delete it.
 Admin User Role Test: Go to /admin/users -> Change a user's role to "Host" -> Log in as that user -> Verify Host access.
 Room Wizard Test: Click "Airbnb your home" -> Complete all steps including photo upload -> Submit -> Verify redirection to new Room Detail page.
Phase 12: Host Features & Advanced Reviews
 Host Features
 My Rooms: Dashboard to manage own listings (Active/Inactive toggle)
 Booking Management: Calendar view, Approve/Decline actions
 Real Airbnb Review System
 Restrict reviews to users with completed bookings only
 Implement detailed ratings (Cleanliness, Accuracy, Communication, Location, Check-in, Value)
 Allow Hosts to reply to reviews
 Backend Alignments
 Verify/Add APIs for Admin Amenity/Category CRUD
 Optimization for multi-part image uploads
✅ User Verification Checklist (Phase 12)
 Host Dashboard Test: Go to "My Rooms" -> Toggle a room "Inactive" -> Log out -> Search for that room (Should not appear).
 Booking Action Test: Make a booking request as User A -> Log in as Host -> "Approve" booking -> Check User A's "Trips" page (Status: Confirmed).
 Review Logic Test: Try reviewing a room without booking -> Expect error/block. Complete booking -> Write review -> Check Room Detail Rating.
Phase 13: Major Missing Modules
 Experience Module
 Landing Page: List all experiences
 Detail Page: Show experience info, photos, and video
 Registration/Edit: Create and Update Experiences
 Media Management (Photos & Videos)
 Room Media:
 Frontend: "Edit Photos" page (Add/Delete/Reorder)
 Backend: Add Video support for Rooms (Currently missing in model)
 Experience Media:
 Frontend: Upload Photos & Video URLs
 Backend: Improve Video model (consider file upload vs URL)
 Advanced Search & Filtering
 Frontend: Search bar (Date, Guests, Location) & Filters (Price, Amenities)
 Backend: Query param support
 Wishlists & Messages
 Frontend: Wishlist toggle & Page
 Frontend: Chat UI & Real-time updates
 User Profile
 Edit Profile (Avatar, Bio, Password)
✅ User Verification Checklist (Phase 13)
 Search Test: Filter by "Pool" amenity -> Verify only rooms with pools show up.
 Wishlist Test: Click Heart icon on Room A -> Go to "My Wishlists" -> Click Room A -> Verify link works.
 Message Test: User -> Host "Hello" -> Host sees message -> Host replies "Hi" -> User sees reply.
 Media Update Test: Go to "Edit Room" -> Upload new Video -> Save -> Go to Room Detail -> Play Video.