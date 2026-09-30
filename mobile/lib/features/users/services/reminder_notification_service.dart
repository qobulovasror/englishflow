import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_timezone/flutter_timezone.dart';
import 'package:timezone/data/latest.dart' as tz_data;
import 'package:timezone/timezone.dart' as tz;

class ReminderNotificationService {
  ReminderNotificationService._();

  static final ReminderNotificationService instance =
      ReminderNotificationService._();
  final FlutterLocalNotificationsPlugin _plugin =
      FlutterLocalNotificationsPlugin();
  bool _initialized = false;

  Future<void> initialize() async {
    if (_initialized) return;
    tz_data.initializeTimeZones();
    final localZone = await FlutterTimezone.getLocalTimezone();
    tz.setLocalLocation(tz.getLocation(localZone));
    await _plugin.initialize(
      const InitializationSettings(
        android: AndroidInitializationSettings('@mipmap/ic_launcher'),
        iOS: DarwinInitializationSettings(),
      ),
    );
    _initialized = true;
  }

  Future<bool> requestPermission() async {
    await initialize();
    final android = await _plugin
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.requestNotificationsPermission();
    final ios = await _plugin
        .resolvePlatformSpecificImplementation<
            IOSFlutterLocalNotificationsPlugin>()
        ?.requestPermissions(alert: true, badge: false, sound: true);
    return android ?? ios ?? true;
  }

  Future<String> localTimezone() => FlutterTimezone.getLocalTimezone();

  Future<void> cancelAll() async {
    await initialize();
    for (var day = DateTime.monday; day <= DateTime.sunday; day++) {
      await _plugin.cancel(700 + day);
    }
  }

  Future<void> configure({
    required bool enabled,
    required int hour,
    required int minute,
    required List<int> days,
    required String timezone,
  }) async {
    await initialize();
    await cancelAll();
    if (!enabled) return;

    final zone = tz.getLocation(timezone);
    tz.setLocalLocation(zone);
    final now = tz.TZDateTime.now(zone);
    for (final day in days) {
      var daysUntil =
          (day - now.weekday + DateTime.daysPerWeek) % DateTime.daysPerWeek;
      var scheduled = tz.TZDateTime(
        zone,
        now.year,
        now.month,
        now.day + daysUntil,
        hour,
        minute,
      );
      if (!scheduled.isAfter(now)) {
        daysUntil += DateTime.daysPerWeek;
        scheduled = tz.TZDateTime(
          zone,
          now.year,
          now.month,
          now.day + daysUntil,
          hour,
          minute,
        );
      }
      await _plugin.zonedSchedule(
        700 + day,
        'EnglishFlow review',
        'Your daily vocabulary review is ready when you are.',
        scheduled,
        const NotificationDetails(
          android: AndroidNotificationDetails(
            'study_reminders',
            'Study reminders',
            channelDescription: 'A reminder at the time you selected.',
            importance: Importance.defaultImportance,
            priority: Priority.defaultPriority,
          ),
          iOS: DarwinNotificationDetails(),
        ),
        androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
        matchDateTimeComponents: DateTimeComponents.dayOfWeekAndTime,
      );
    }
  }
}
