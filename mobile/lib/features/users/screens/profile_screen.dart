import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:englishflow/core/network/api_exception.dart';
import 'package:englishflow/core/theme/app_colors.dart';
import 'package:englishflow/core/utils/snackbar_utils.dart';
import 'package:englishflow/core/utils/validators.dart';
import 'package:englishflow/features/auth/providers/auth_provider.dart';
import 'package:englishflow/shared/widgets/app_button.dart';
import 'package:englishflow/shared/widgets/app_text_field.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  final _emailFormKey = GlobalKey<FormState>();
  final _passwordFormKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _emailCurrentPwController = TextEditingController();
  final _currentPwController = TextEditingController();
  final _newPwController = TextEditingController();
  final _confirmPwController = TextEditingController();

  bool _emailSubmitting = false;
  bool _passwordSubmitting = false;
  bool _initialFetchAttempted = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _initialise());
  }

  @override
  void dispose() {
    _emailController.dispose();
    _emailCurrentPwController.dispose();
    _currentPwController.dispose();
    _newPwController.dispose();
    _confirmPwController.dispose();
    super.dispose();
  }

  Future<void> _initialise() async {
    final cached = ref.read(authProvider).user;
    if (cached != null) {
      _emailController.text = cached.email;
    }
    try {
      final fresh = await ref.read(authProvider.notifier).fetchMe();
      if (!mounted) return;
      if (_emailController.text != fresh.email) {
        _emailController.text = fresh.email;
      }
    } catch (_) {
      // SnackbarUtils intentionally not shown for the silent load;
      // the cached user is still displayed.
    } finally {
      if (mounted) setState(() => _initialFetchAttempted = true);
    }
  }

  Future<void> _submitEmail() async {
    if (!(_emailFormKey.currentState?.validate() ?? false)) return;
    final currentEmail = ref.read(authProvider).user?.email;
    final next = _emailController.text.trim();
    if (next == currentEmail) {
      SnackbarUtils.showInfo(context, 'Email is unchanged');
      return;
    }

    setState(() => _emailSubmitting = true);
    try {
      await ref.read(authProvider.notifier).updateProfile(
            email: next,
            currentPassword: _emailCurrentPwController.text,
          );
      if (!mounted) return;
      _emailCurrentPwController.clear();
      SnackbarUtils.showSuccess(context, 'Email updated');
    } on ApiException catch (e) {
      if (!mounted) return;
      SnackbarUtils.showError(context, e.message);
    } catch (e) {
      if (!mounted) return;
      SnackbarUtils.showError(context, 'Failed to update email');
    } finally {
      if (mounted) setState(() => _emailSubmitting = false);
    }
  }

  Future<void> _submitPassword() async {
    if (!(_passwordFormKey.currentState?.validate() ?? false)) return;

    setState(() => _passwordSubmitting = true);
    try {
      await ref.read(authProvider.notifier).changePassword(
            currentPassword: _currentPwController.text,
            newPassword: _newPwController.text,
          );
      if (!mounted) return;
      _currentPwController.clear();
      _newPwController.clear();
      _confirmPwController.clear();
      _passwordFormKey.currentState?.reset();
      SnackbarUtils.showSuccess(context, 'Password updated');
    } on ApiException catch (e) {
      if (!mounted) return;
      SnackbarUtils.showError(context, e.message);
    } catch (e) {
      if (!mounted) return;
      SnackbarUtils.showError(context, 'Failed to change password');
    } finally {
      if (mounted) setState(() => _passwordSubmitting = false);
    }
  }

  Future<void> _confirmLogout() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Sign out?'),
        content: const Text('You will need to log in again to continue.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppColors.error),
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('Sign out'),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      await ref.read(authProvider.notifier).logout();
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider.select((s) => s.user));
    final isLoadingProfile =
        !_initialFetchAttempted && user == null;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Sign out',
            onPressed: _confirmLogout,
          ),
        ],
      ),
      body: isLoadingProfile
          ? const Center(child: CircularProgressIndicator())
          : SafeArea(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _AccountCard(user: user),
                    const SizedBox(height: 16),
                    _SectionCard(
                      title: 'Update email',
                      child: Form(
                        key: _emailFormKey,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            AppTextField(
                              controller: _emailController,
                              label: 'Email',
                              keyboardType: TextInputType.emailAddress,
                              validator: Validators.email,
                              prefixIcon: Icons.email_outlined,
                            ),
                            const SizedBox(height: 12),
                            AppTextField(
                              controller: _emailCurrentPwController,
                              label: 'Current password',
                              obscureText: true,
                              prefixIcon: Icons.lock_outline,
                              validator: (v) => Validators.required(
                                v,
                                'Current password',
                              ),
                            ),
                            const SizedBox(height: 16),
                            AppButton(
                              text: 'Save email',
                              isLoading: _emailSubmitting,
                              onPressed: _emailSubmitting ? null : _submitEmail,
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    _SectionCard(
                      title: 'Change password',
                      child: Form(
                        key: _passwordFormKey,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            AppTextField(
                              controller: _currentPwController,
                              label: 'Current password',
                              obscureText: true,
                              prefixIcon: Icons.lock_outline,
                              validator: (v) => Validators.required(v, 'Current password'),
                            ),
                            const SizedBox(height: 12),
                            AppTextField(
                              controller: _newPwController,
                              label: 'New password',
                              obscureText: true,
                              prefixIcon: Icons.lock_reset,
                              validator: (v) {
                                final base = Validators.password(v);
                                if (base != null) return base;
                                if (v == _currentPwController.text) {
                                  return 'New password must differ from current';
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: 12),
                            AppTextField(
                              controller: _confirmPwController,
                              label: 'Confirm new password',
                              obscureText: true,
                              prefixIcon: Icons.lock,
                              validator: (v) => Validators.confirmPassword(
                                v,
                                _newPwController.text,
                              ),
                            ),
                            const SizedBox(height: 16),
                            AppButton(
                              text: 'Update password',
                              isLoading: _passwordSubmitting,
                              onPressed:
                                  _passwordSubmitting ? null : _submitPassword,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}

class _AccountCard extends StatelessWidget {
  final dynamic user;
  const _AccountCard({required this.user});

  @override
  Widget build(BuildContext context) {
    final created = user?.createdAt as DateTime?;
    final memberSince = created != null
        ? DateFormat.yMMMMd().format(created.toLocal())
        : '—';

    return _SectionCard(
      title: 'Account',
      child: Column(
        children: [
          _InfoRow(label: 'User ID', value: user?.id ?? '—', monospace: true),
          const Divider(height: 24),
          _InfoRow(label: 'Email', value: user?.email ?? '—'),
          const Divider(height: 24),
          _InfoRow(label: 'Member since', value: memberSince),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;
  final bool monospace;
  const _InfoRow({
    required this.label,
    required this.value,
    this.monospace = false,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 110,
          child: Text(
            label,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Colors.grey[600],
                ),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  fontFamily: monospace ? 'monospace' : null,
                ),
          ),
        ),
      ],
    );
  }
}

class _SectionCard extends StatelessWidget {
  final String title;
  final Widget child;
  const _SectionCard({required this.title, required this.child});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              title,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
            ),
            const SizedBox(height: 16),
            child,
          ],
        ),
      ),
    );
  }
}
