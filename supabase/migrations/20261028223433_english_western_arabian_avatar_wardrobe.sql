begin;
insert into public.saddle_decor_catalog(id,name,kind,premium) values
 ('avatar-hunter','Hunter rider','avatar',true),
 ('avatar-jumper','Show jumper','avatar',true),
 ('avatar-classical-dressage','Dressage rider','avatar',true),
 ('avatar-cross-country','Cross-country rider','avatar',true),
 ('avatar-saddle-seat','Saddle seat rider','avatar',true),
 ('avatar-schooling','Schooling rider','avatar',false),
 ('avatar-ranch','Ranch rider','avatar',false),
 ('avatar-western-pleasure','Western pleasure rider','avatar',true),
 ('avatar-reining','Reining rider','avatar',true),
 ('avatar-barrel','Barrel rider','avatar',true),
 ('avatar-western-trail','Western trail rider','avatar',true),
 ('avatar-arabian-country','Arabian country pleasure','avatar',false),
 ('avatar-arabian-english','Arabian English pleasure','avatar',true),
 ('avatar-arabian-hunter','Arabian hunter pleasure','avatar',true),
 ('avatar-arabian-native','Arabian native costume','avatar',true);
commit;
