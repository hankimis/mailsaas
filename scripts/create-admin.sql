-- ============================================
-- 메일톡 Super Admin 계정 생성 스크립트
-- ============================================
--
-- 실행 순서:
-- 1. 먼저 supabase/migrations/001_initial_schema.sql 실행 (테이블 생성)
-- 2. Supabase Dashboard > Authentication > Users에서 사용자 생성
-- 3. 이 스크립트 실행
-- ============================================

-- 간편 스크립트 (한 번에 실행)
DO $$
DECLARE
  v_user_id uuid;
  v_company_id uuid;
BEGIN
  -- auth.users에서 이메일로 사용자 ID 찾기
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'hankim.masion@gmail.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '사용자를 찾을 수 없습니다. Supabase Authentication에서 먼저 사용자를 생성하세요.

    방법:
    1. Supabase Dashboard 접속
    2. Authentication > Users
    3. Add user > Create new user
    4. Email: hankim.masion@gmail.com
    5. Password: kjh1949s!
    6. Auto Confirm User 체크
    7. 이 스크립트 다시 실행';
  END IF;

  -- 시스템 회사 생성 또는 기존 회사 ID 가져오기
  INSERT INTO companies (
    name,
    slug,
    domain,
    domain_management_type,
    domain_status,
    use_temp_domain,
    status,
    contact_email
  ) VALUES (
    '메일톡 시스템',
    'mailtalk-system',
    'mailtalk.kr',
    'self_managed',
    'verified',
    false,
    'active',
    'hankim.masion@gmail.com'
  )
  ON CONFLICT (slug) DO UPDATE SET name = '메일톡 시스템'
  RETURNING id INTO v_company_id;

  -- 사용자 프로필 생성 또는 업데이트
  INSERT INTO users (
    id,
    email,
    full_name,
    role,
    company_id,
    is_active,
    phone_verified
  ) VALUES (
    v_user_id,
    'hankim.masion@gmail.com',
    'Admin',
    'super_admin',
    v_company_id,
    true,
    false
  )
  ON CONFLICT (id) DO UPDATE SET
    role = 'super_admin',
    is_active = true;

  RAISE NOTICE '';
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Super Admin 계정이 성공적으로 생성되었습니다!';
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'User ID: %', v_user_id;
  RAISE NOTICE 'Company ID: %', v_company_id;
  RAISE NOTICE '';
  RAISE NOTICE '로그인 정보:';
  RAISE NOTICE '  이메일: hankim.masion@gmail.com';
  RAISE NOTICE '  비밀번호: kjh1949s!';
  RAISE NOTICE '  로그인 URL: https://mailtalk.kr/login';
  RAISE NOTICE '';
  RAISE NOTICE 'Super Admin은 모든 회사와 사용자를 관리할 수 있습니다.';
  RAISE NOTICE '==========================================';
END $$;
