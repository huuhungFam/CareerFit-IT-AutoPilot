import sys
with open('Backend/careerfit-backend/src/main/java/com/careerfit/backend/auth/entity/UserAccount.java', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(len(lines)):
    if '@Id' in lines[i] and 'full_name' in lines[i+1]:
        lines[i] = '    @Id\n    @GeneratedValue(strategy = GenerationType.UUID)\n    private UUID id;\n\n    @Column(nullable = false, length = 255)\n    private String email;\n\n    /** Nullable for accounts that have no password (e.g. some imported accounts or 3rd-party auth). */\n    @Column(name = \ password_hash\, length = 255)\n    private String passwordHash;\n\n    @Column(nullable = false, length = 20)\n    @Enumerated(EnumType.STRING)\n    private Role role;\n\n    @Column(name = \full_name\, length = 255)\n'
        del lines[i+1]
        break

with open('Backend/careerfit-backend/src/main/java/com/careerfit/backend/auth/entity/UserAccount.java', 'w', encoding='utf-8') as f:
    f.writelines(lines)
