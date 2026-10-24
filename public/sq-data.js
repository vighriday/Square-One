(function () {
'use strict';
const SQ = window.SQ = window.SQ || {};
if (SQ._loaded && SQ._loaded.data) return;
// Question tuples: [question, [correct, wrong, wrong, wrong], fix]. Answers are shuffled at load.
const Q = (q, a, fix) => ({ q, a, c: 0, fix });
const R = (title, why, steps, doneWhen, video, minutes, mName, mq, ma, mfix) => ({ title, why, content: { steps, doneWhen, video, minutes, monster: Object.assign({ name: mName }, Q(mq, ma, mfix)) } });

SQ.SAMPLE = {
  id: 'sample-python', sample: true, skill: 'Python', lang: 'en', fortName: 'The Serpent Keep',
  floors: [
    { name: 'The Gatehouse', parMinutes: 12 },
    { name: 'Hall of Choices', parMinutes: 16 },
    { name: 'The Workshop', parMinutes: 18 },
    { name: 'The Moon Tower', parMinutes: 24 }
  ],
  rooms: [
    R('Print your name', 'Your first line of code proves Python runs and listens to you.',
      ['Open a free online editor: search "Python online" (e.g. programiz.com/python)', 'Type `print("Your Name")` with your real name', 'Press Run and find your name in the output'],
      'Your name appears in the output panel.', 'python print hello world beginner', 2,
      'Forgotten-Quote Gremlin', 'Which line prints your name?', ['`print("Asha")`', '`print(Asha)`', '`Print("Asha")`', '`echo "Asha"`'], 'Text needs quotes, and `print` is all lowercase.'),
    R('Store things in variables', 'Variables let your code remember things so you can reuse them.',
      ['Write `name = "Asha"` and `age = 20`', 'Print both: `print(name, age)`', 'Change it: `age = age + 1`, then print again', 'Name variables in lowercase_with_underscores'],
      'You change a variable and see the new value printed.', 'python variables for beginners', 6,
      'Stale-Value Imp', 'After `x = 5` then `x = x + 2`, what is `x`?', ['7', '5', '2', 'An error'], '`x = x + 2` takes the old value (5) and adds 2.'),
    R('Do math with numbers', 'Most programs count, measure or calculate something.',
      ['Try `+ - * /` on two numbers', 'Compare `7 / 2` with `7 // 2`', 'Find a remainder with `10 % 3`', 'Raise a power with `2 ** 5`'],
      'You can predict each result before you press Run.', 'python arithmetic operators beginners', 6,
      'Floor-Division Ogre', 'What does `7 // 2` give?', ['3', '3.5', '4', '1'], '`//` drops the decimal part; `7 / 2` gives 3.5.'),
    R('Work with text (strings)', 'Names, messages and data are all text you will shape every day.',
      ['Join two strings with `+`', 'Use an f-string: `f"Hi {name}"`', 'Try `.upper()`, `.lower()` and `len()`', 'Slice the first 3 letters: `name[:3]`'],
      'You print a sentence built from variables with an f-string.', 'python strings f-strings beginners', 8,
      'String-Glue Slime', 'What does `"5" + "5"` give?', ['`"55"`', '`10`', '`"10"`', 'An error'], '`+` glues strings together; use `int()` first to add numbers.'),
    R('Ask the user a question', 'Input turns a script into a program people can talk to.',
      ['Write `name = input("Your name? ")`', 'Greet them back with an f-string', 'Ask their age and add 1 using `int()`', 'Run it twice with different answers'],
      'Your program asks, waits, and replies with what you typed.', 'python input function int conversion', 8,
      'Gatekeeper Golem', '`age = input("Age? ")` and you type 20. What type is `age`?', ['`str` (text)', '`int`', '`float`', '`bool`'], '`input()` always returns text; wrap it in `int()` for numbers.'),
    R('Make decisions with if', 'Decisions let your program react differently to different situations.',
      ['Print "Adult" when `age >= 18`', 'Add an `else:` branch', 'Add an `elif age >= 60:` branch', 'Indent each block with 4 spaces'],
      'Your program prints different words for 3 different ages.', 'python if elif else beginners', 8,
      'Single-Equals Specter', 'Which line checks if `x` is 10?', ['`if x == 10:`', '`if x = 10:`', '`if x === 10:`', '`if x is 10 then:`'], 'One `=` stores a value; `==` compares two values.'),
    R('Repeat with for and range', 'Loops do boring repetition for you, perfectly, every time.',
      ['Print 1 to 5 with `for i in range(1, 6):`', 'Loop over a word: `for ch in "python":`', 'Add up 1 to 100 with a loop', 'Notice exactly where range stops'],
      'You can make a loop run exactly N times on purpose.', 'python for loop range explained', 10,
      'Off-by-One Imp', 'What does `list(range(1, 5))` give?', ['`[1, 2, 3, 4]`', '`[1, 2, 3, 4, 5]`', '`[0, 1, 2, 3, 4]`', '`[2, 3, 4, 5]`'], '`range` stops just before the end number.'),
    R('Loop until done with while', 'Some jobs repeat until something changes, not a fixed number of times.',
      ['Count down from 5 with `while n > 0:`', 'Lower `n` inside the loop: `n -= 1`', 'Make a guessing game that loops until correct', 'Use `break` to leave early'],
      'Your loop stops on its own every time.', 'python while loop break beginners', 10,
      'Endless-Loop Wraith', '`n = 3` then `while n > 0: print(n)`. What happens?', ['It never stops', 'It prints 3 2 1', 'It prints nothing', 'It crashes at once'], 'Change the counter inside the loop, e.g. `n -= 1`.'),
    R('Keep lists of things', 'Lists hold many values in order, like a shopping list.',
      ['Make `fruits = ["apple", "mango", "kiwi"]`', 'Print the first item: `fruits[0]`', 'Add one with `.append()`', 'Loop over the list and print each fruit'],
      'You add, read and loop over items in a list.', 'python lists beginners append index', 10,
      'Zero-Index Kobold', '`fruits = ["apple", "mango", "kiwi"]`. What is `fruits[1]`?', ['`"mango"`', '`"apple"`', '`"kiwi"`', 'An error'], 'Lists count from 0, so `[1]` is the second item.'),
    R('Look things up with dictionaries', 'Dictionaries find a value by name instantly, like a phone book.',
      ['Make `ages = {"Asha": 20, "Ravi": 25}`', 'Read one with `ages["Asha"]`', 'Add a new key and value', 'Use `.get()` for a key that may be missing'],
      'You store, read and safely look up values by key.', 'python dictionary beginners get keys', 10,
      'KeyError Kraken', '`d = {"a": 1}`. What does `d.get("b")` give?', ['`None`', '`0`', 'A KeyError', '`"b"`'], '`.get()` returns None for missing keys; `d["b"]` would crash.'),
    R('Write your own functions', 'Functions package code you can reuse by name.',
      ['Define `def greet():` that prints hello', 'Call it three times', 'Add a parameter: `def greet(name):`', 'Call it with different names'],
      'You call one function you wrote with different inputs.', 'python functions def beginners', 10,
      'Never-Called Gnome', 'You wrote `def greet(): print("hi")`. How do you run it?', ['`greet()`', '`greet`', '`run greet`', '`def greet()`'], 'Add `()` to call a function; the name alone just points at it.'),
    R('Return values from functions', 'Returning results lets functions feed the rest of your code.',
      ['Write `def add(a, b): return a + b`', 'Store the result: `total = add(2, 3)`', 'Compare `print` inside vs `return`', 'Give a parameter a default value'],
      'You use a returned value in another calculation.', 'python return vs print functions', 10,
      'Missing-Return Phantom', '`def add(a, b): a + b`. What does `add(2, 3)` give?', ['`None`', '`5`', '`23`', 'An error'], 'Without `return`, a function gives back None.'),
    R('Read and write files', 'Files let your data survive after the program ends.',
      ['Write a line with `open("notes.txt", "w")`', 'Read it back with `.read()`', 'Append with mode `"a"`', 'Switch to `with open(...) as f:`'],
      'You write a file, close the program, and read it back.', 'python read write files with open', 12,
      'Unclosed-File Ghoul', 'Best way to open a file so it closes itself?', ['`with open("notes.txt") as f:`', '`f = open("notes.txt")`', '`open.file("notes.txt")`', '`file("notes.txt").close()`'], '`with` closes the file for you, even if something goes wrong.'),
    R('Handle errors with try/except', 'Good programs survive bad input instead of crashing.',
      ['Make `int("abc")` crash and read the error', 'Wrap it in `try:` / `except ValueError:`', 'Print a friendly message instead', 'Loop until the user types a real number'],
      'Bad input gets a friendly message, not a crash.', 'python try except valueerror beginners', 12,
      'Bare-Except Banshee', 'Which line catches only bad number input?', ['`except ValueError:`', '`except:`', '`catch ValueError:`', '`if error:`'], 'Name the error you expect; a bare `except` hides real bugs.'),
    R('Use modules and pip', 'Modules give you thousands of ready-made tools for free.',
      ['`import random` and pick a random number', 'Try `import math` and `math.sqrt(16)`', 'Install a package: `pip install requests`', 'Import only what you need: `from math import pi`'],
      'You use one built-in module and one installed package.', 'python modules import pip install beginners', 12,
      'Missing-Module Minotaur', 'You see `ModuleNotFoundError: requests`. The fix?', ['Run `pip install requests`', 'Rename your file', 'Write `import request`', 'Restart the computer'], 'pip installs packages that do not come with Python.'),
    R('Build classes and objects', 'Classes bundle data and actions together, like a blueprint.',
      ['Write `class Dog:` with an `__init__`', 'Store `self.name` inside it', 'Add a method `bark(self)`', 'Make two dogs and call bark on each'],
      'Two objects from one class print different names.', 'python classes objects self beginners', 14,
      'Self-Forgetting Sprite', 'Inside a method, how do you reach the object\'s name?', ['`self.name`', '`name`', '`this.name`', '`Dog.name`'], 'Methods receive the object as `self`; use `self.name`.'),
    R('Fetch data from the web', 'APIs let your code pull live data from anywhere.',
      ['`pip install requests` if you have not yet', 'Call `requests.get("https://api.github.com")`', 'Check `r.status_code`', 'Turn the reply into a dict with `r.json()`'],
      'You print one value from a real API\'s JSON.', 'python requests api json beginners', 14,
      'Status-Skipping Sniffer', '`r = requests.get(url)`. How do you check it worked?', ['`r.status_code == 200`', '`r == True`', '`print(url)`', '`r.ok() == "yes"`'], '200 means OK; check the status before using `r.json()`.'),
    R('Debug like a pro', 'Reading errors calmly turns hours of guessing into minutes.',
      ['Break your code on purpose and read the traceback', 'Find the line number it points to', 'Add a `print()` to check a value', 'Try your editor\'s debugger once'],
      'You fix a bug just by reading its error message.', 'python debugging traceback beginners', 12,
      'Panic-Scroll Poltergeist', 'Your code crashes with a long traceback. Read which part first?', ['The last line: the error', 'The first line', 'The middle part', 'None of it'], 'The last line names the error; the lines above show where.'),
    R('Plan your project', 'A small plan keeps a project from growing out of control.',
      ['Pick a to-do app as your project', 'List 3 must-have features', 'Sketch the menu: add, list, remove, quit', 'Write the steps as comments first'],
      'You have 3 features and a comment outline in a file.', 'python project planning beginners todo app', 10,
      'Scope-Creep Hydra', 'The first version of your to-do app should have…', ['Add, list and remove tasks', 'Login, cloud sync and AI', 'A logo and a website', 'Nothing until you know more'], 'Ship the smallest working version first, then grow it.'),
    R('Build a to-do app', 'A real project ties every room together and proves you can build.',
      ['Make a menu loop with `while True:`', 'Store tasks in a list; add and remove them', 'Number tasks with `enumerate(tasks, 1)`', 'Save tasks to a file and load them on start', 'Catch bad input with `try/except`'],
      'Your app adds, lists and removes tasks, and remembers them after a restart.', 'python to do list app beginners project', 30,
      'Legacy-Code Leviathan', 'Your app must keep tasks after closing. What do you add?', ['Save to a file, load on start', 'A bigger list', 'A `while True:` loop', '`print()` every task'], 'Variables vanish when the program ends; files keep the data.')
  ],
  warm: [
    Q('Which line prints Hello?', ['`print("Hello")`', '`echo Hello`', '`Print Hello`', '`console.log("Hello")`'], 'Python uses lowercase `print()` with text in quotes.'),
    Q('What does `len("cat")` give?', ['`3`', '`"cat"`', '`1`', '`cat3`'], '`len` counts the characters in a string.'),
    Q('What does `[x * 2 for x in range(3)]` give?', ['`[0, 2, 4]`', '`[2, 4, 6]`', '`[0, 1, 2]`', '`[1, 2, 3]`'], '`range(3)` is 0, 1, 2 — each one is doubled.')
  ],
  extras: {
    secrets: [
      { questions: [
        Q('What does `2 ** 3` give?', ['`8`', '`6`', '`9`', '`5`'], '`**` is power: 2 × 2 × 2.'),
        Q('What does `"Py" * 3` give?', ['`"PyPyPy"`', '`"Py3"`', 'An error', '`9`'], 'Multiplying a string repeats it.'),
        Q('How many numbers does `range(5)` give?', ['5', '4', '6', '0'], '`range(5)` is 0 to 4: five numbers.')
      ] },
      { questions: [
        Q('`def f(x=2): return x * 3`. What is `f()`?', ['`6`', '`None`', 'An error', '`2`'], 'With no argument, `x` uses its default, 2.'),
        Q('Which mode adds to the end of a file?', ['`"a"`', '`"w"`', '`"r"`', '`"x"`'], '`"a"` appends; `"w"` wipes the file first.'),
        Q('`class Dog: pass`. How do you make one?', ['`Dog()`', '`new Dog`', '`Dog.make()`', '`class Dog()`'], 'Call the class like a function to make an object.')
      ] }
    ],
    elites: [
      Object.assign({ teaches: 7, name: 'Off-by-One Overlord' }, Q('How many times does `for i in range(2, 6):` run?', ['4', '5', '6', '3'], '`range(2, 6)` gives 2, 3, 4, 5 — it stops before 6.')),
      Object.assign({ teaches: 9, name: 'Zero-Index Warlord' }, Q('`nums = [10, 20, 30]`. What is `nums[3]`?', ['An IndexError', '`30`', '`10`', '`None`'], 'Indexes here go 0 to 2; the last item is `nums[-1]`.'))
    ],
    bosses: [
      { name: 'Gatekeeper Golem', questions: [
        Q('`name = "Ravi"`. What does `print("Hi " + name)` show?', ['Hi Ravi', 'Hi name', 'HiRavi', 'An error'], 'A variable is replaced by its value; the space sits inside the quotes.'),
        Q('What does `10 % 3` give?', ['`1`', '`3`', '`3.33`', '`0`'], '`%` gives the remainder after dividing.')
      ] },
      { name: 'KeyError Kraken', questions: [
        Q('`for i in range(3): print(i)` prints?', ['0 1 2', '1 2 3', '0 1 2 3', '3'], '`range(3)` starts at 0 and stops before 3.'),
        Q('How do you add "pear" to the list `fruits`?', ['`fruits.append("pear")`', '`fruits.add("pear")`', '`fruits + "pear"`', '`fruits.push("pear")`'], 'Lists use `append()`; `push` is JavaScript.')
      ] },
      { name: 'Missing-Module Minotaur', questions: [
        Q('Which reads a whole file into one string?', ['`f.read()`', '`f.readline()`', '`f.get()`', '`read(f)`'], '`read()` takes everything; `readline()` takes one line.'),
        Q('`def sq(x): return x * x`. What is `sq(4)`?', ['`16`', '`8`', '`None`', '`x * x`'], '`return` sends back 4 × 4.')
      ] },
      { name: 'Legacy-Code Leviathan', questions: [
        Q('`tasks = []` then `tasks.append("milk")`. What is `len(tasks)`?', ['`1`', '`0`', '`4`', '`"milk"`'], '`len` counts items: one task.'),
        Q('Which loop numbers your tasks from 1?', ['`for i, t in enumerate(tasks, 1):`', '`for i in tasks:`', '`while tasks:`', '`for t in range(tasks):`'], '`enumerate(list, 1)` gives a counter starting at 1.'),
        Q('The user types "x" and you run `int("x")`. What happens?', ['A ValueError', 'A TypeError', 'A KeyError', 'Nothing'], '`int()` raises ValueError on text that is not a number — catch it.')
      ] }
    ]
  }
};

SQ.SKILLS = [
  { id: 'Python', en: 'Python', hi: 'पाइथन', hl: 'Python' },
  { id: 'Spoken English', en: 'Spoken English', hi: 'बोलचाल की अंग्रेज़ी', hl: 'Spoken English' },
  { id: 'Excel', en: 'Excel', hi: 'एक्सेल', hl: 'Excel' },
  { id: 'Public Speaking', en: 'Public Speaking', hi: 'पब्लिक स्पीकिंग', hl: 'Public Speaking' },
  { id: 'Guitar', en: 'Guitar', hi: 'गिटार', hl: 'Guitar' },
  { id: 'Personal Finance', en: 'Personal Finance', hi: 'पर्सनल फ़ाइनेंस', hl: 'Personal Finance' }
];

SQ.KEYS = [
  { id: 'green', hex: '#57d36a' }, { id: 'blue', hex: '#4fa3ff' }, { id: 'gold', hex: '#ffc23d' },
  { id: 'red', hex: '#ff5a4f' }, { id: 'violet', hex: '#b57bff' }
];
SQ.WEAPONS = [
  { id: 'ember', hex: '#ffb22e' }, { id: 'frost', hex: '#5ad1ff' }, { id: 'venom', hex: '#9be15d' }, { id: 'arc', hex: '#ff6bd5' }
];

SQ.LANGS = [{ id: 'en', label: 'English' }, { id: 'hi', label: 'हिंदी' }, { id: 'hl', label: 'Hinglish' }];

SQ.I18N = {
  en: {
    tagline: 'Everyone starts at square one. Nobody stays there.',
    ask: 'What do you want to learn?', placeholder: 'Type any skill — e.g. Python, Excel, chess', build: 'Build my fort', orPick: 'Or pick one',
    language: 'Language', cont: 'Continue', sample: 'Play the sample fort (offline)', demo14: 'Demo save: room 14',
    aiOff: 'AI is not reachable here. The sample Python fort works offline.', errEmpty: 'Type a skill first.', errBad: 'That one can’t become a fort. Try another skill.',
    warmup: 'Warm-up', warmSub: 'Hit all 3 dummies to start on floor 2.', dummies: 'Dummies arriving…', noDummies: 'No dummies today — the fort is nearly ready.',
    building: 'Building your fort', b1: 'Asking the architect', b2: 'Drawing 20 rooms', b3: 'Checking every room', b4: 'Lighting the torches', b5: 'Fort ready',
    almost: 'Fort almost ready…', warmAll: '3 of 3! The lift takes you to floor 2.', warmSome: '{n} of 3. You start at Square One.',
    buildFail: 'The architect lost the blueprints.', retry: 'Try again', back: 'Back',
    oStart: 'Get the {color} key: finish {title}', oTerm: 'Walk to the terminal.', oRead: 'Read the terminal, then close it.',
    oFight: 'Fire the right weapon at the {name}.', oKey: 'Grab the {color} keycard.', oDoor: 'The door is open. Walk through.', oLift: 'The lift is open. Ride it to floor {n}.',
    oElite: 'An elite monster blocks the way. Beat the {name}.', oBoss: 'Beat the {name}: {n} hits.', oSecret: 'Secret passage! Walk through to skip to room {n}.',
    oReview: 'Portal lesson: fix the mistake in room {n}.', oPortal: 'Step into the portal back to room {n}.', oWarm: 'Shoot the dummies while the fort is built.',
    oWait: 'Waiting for the fort…', oExitWarm: 'Take the lift.',
    floor: 'Floor', room: 'Room', of: 'of', health: 'Health', armour: 'Armour', days: 'days', day: 'day', keys: 'Keys', score: 'Score', combo: 'Combo', floorDone: 'Floor {n} done',
    pTerm: 'Open terminal', pCrack: 'Tap the cracked wall', pLocked: 'Locked. You need the {color} keycard.', pGlide: 'Auto-walk',
    terminal: 'Terminal', why: 'Why it matters', doNow: 'Do this now', watch: 'Watch', doneWhen: 'You’re done when', closeDone: 'Done — close terminal',
    booting: 'Booting terminal…', termErr: 'The terminal flickered out.', useBasic: 'Use a basic room', reviewKick: 'Portal lesson', reviewFix: 'What tripped you up', mins: '~{n} min',
    findVideo: 'Finding the best video…', openYT: 'Open on YouTube', search: 'Search',
    fix: 'Fix', firstTry: 'First try! +50', cleared: 'Room {n} cleared', fell: 'You fell.', fellSub: 'Restart the room — nothing is lost.', restart: 'Restart the room',
    map: 'Map', here: 'You are here', next: 'Next', done: 'Done', skipped: 'Known', locked: 'Ahead', tSecret: 'Secret', tElite: 'Elite', tBoss: 'Boss', tFinal: 'Final boss', close: 'Close',
    pause: 'Paused', resume: 'Resume', quit: 'Quit to title', settings: 'Settings', music: 'Music', sfx: 'Sound effects', glide: 'Auto-glide (phone style)', ytKey: 'YouTube API key (optional — picks the best of 8 real videos)',
    resetSave: 'Erase saved game', resetConfirm: 'Tap again to erase', on: 'On', off: 'Off', controls: 'Arrows / WASD move · E use · 1–4 fire · M map · G auto-walk · Esc pause',
    statsTitle: 'Floor {n} cleared', sFirst: 'Monsters beaten first try', sSecrets: 'Secrets found', sTime: 'Time vs par', sScore: 'Floor score', sRank: 'Rank', sBadges: 'New badges', sContinue: 'Continue', sSkip: 'Skip',
    portalOpen: 'The portal pulls you to room {n}.', secretFound: 'Secret found! +500', wallHolds: 'The wall holds. Keep going the normal way.', bossDown: 'Boss down! +1000', crackSpot: 'A cracked wall! Answer 3 quick questions to skip 5 rooms.', tryIt: 'Try it', notNow: 'Not now',
    victory: 'Fort Conquered', vSub: 'You walked all 20 rooms of {fort}.', newFort: 'Build a new fort', totalScore: 'Total score', totalTime: 'Time',
    hits: 'hits', elite: 'Elite', boss: 'Boss', dummy: 'Practice dummy', secretQ: 'Secret wall', hitOf: 'Hit {a} of {b}',
    green: 'green', blue: 'blue', gold: 'gold', red: 'red', violet: 'violet',
    ember: 'Ember', frost: 'Frost', venom: 'Venom', arc: 'Arc',
    bFirst: 'First Room', bUntouch: 'Untouchable', bSecret: 'Secret Hunter', bPortal: 'Portal Survivor', bStreak: '3-Day Streak', bFort: 'Fort Conquered', badge: 'Badge',
    noSave: 'Progress can’t be saved in this browser mode.', saveCorrupt: 'Your old save couldn’t be read, so we started fresh.', liftRise: 'The lift rises to floor {n}', enterKey: 'Press any key or tap to enter', mute: 'Mute', unmute: 'Unmute', loadingFort: 'Reading the fort…'
  },
  hi: {
    tagline: 'हर कोई स्क्वायर वन से शुरू करता है। वहाँ कोई नहीं रुकता।',
    ask: 'आप क्या सीखना चाहते हैं?', placeholder: 'कोई भी स्किल लिखें — जैसे Python, Excel', build: 'मेरा क़िला बनाओ', orPick: 'या कोई एक चुनें',
    language: 'भाषा', cont: 'जारी रखें', sample: 'सैंपल क़िला खेलें (ऑफ़लाइन)', demo14: 'डेमो सेव: कमरा 14',
    aiOff: 'यहाँ AI उपलब्ध नहीं है। सैंपल Python क़िला ऑफ़लाइन चलता है।', errEmpty: 'पहले कोई स्किल लिखें।', errBad: 'इससे क़िला नहीं बन सकता। कोई और स्किल आज़माएँ।',
    warmup: 'वॉर्म-अप', warmSub: 'तीनों डमी को मारें और सीधे मंज़िल 2 से शुरू करें।', dummies: 'डमी आ रहे हैं…', noDummies: 'आज डमी नहीं — क़िला लगभग तैयार है।',
    building: 'आपका क़िला बन रहा है', b1: 'वास्तुकार से पूछ रहे हैं', b2: '20 कमरे बना रहे हैं', b3: 'हर कमरा जाँच रहे हैं', b4: 'मशालें जला रहे हैं', b5: 'क़िला तैयार',
    almost: 'क़िला लगभग तैयार…', warmAll: '3 में से 3! लिफ़्ट आपको मंज़िल 2 पर ले जाएगी।', warmSome: '3 में से {n}। आप स्क्वायर वन से शुरू करेंगे।',
    buildFail: 'वास्तुकार से नक़्शा खो गया।', retry: 'फिर कोशिश करें', back: 'वापस',
    oStart: '{color} चाबी पाएँ: {title} पूरा करें', oTerm: 'टर्मिनल तक चलें।', oRead: 'टर्मिनल पढ़ें, फिर बंद करें।',
    oFight: '{name} पर सही हथियार चलाएँ।', oKey: '{color} कीकार्ड उठाएँ।', oDoor: 'दरवाज़ा खुला है। आगे बढ़ें।', oLift: 'लिफ़्ट खुली है। मंज़िल {n} पर जाएँ।',
    oElite: 'एक एलीट राक्षस रास्ता रोके खड़ा है। {name} को हराएँ।', oBoss: '{name} को हराएँ: {n} वार।', oSecret: 'गुप्त रास्ता! कमरा {n} तक छलांग लगाएँ।',
    oReview: 'पोर्टल पाठ: कमरा {n} की ग़लती सुधारें।', oPortal: 'पोर्टल से कमरा {n} वापस जाएँ।', oWarm: 'क़िला बनने तक डमी पर निशाना लगाएँ।',
    oWait: 'क़िले का इंतज़ार…', oExitWarm: 'लिफ़्ट लें।',
    floor: 'मंज़िल', room: 'कमरा', of: '/', health: 'सेहत', armour: 'कवच', days: 'दिन', day: 'दिन', keys: 'चाबियाँ', score: 'स्कोर', combo: 'कॉम्बो', floorDone: 'मंज़िल {n} पूरी',
    pTerm: 'टर्मिनल खोलें', pCrack: 'दरार वाली दीवार छुएँ', pLocked: 'बंद है। {color} कीकार्ड चाहिए।', pGlide: 'ऑटो-वॉक',
    terminal: 'टर्मिनल', why: 'यह क्यों ज़रूरी है', doNow: 'अभी यह करें', watch: 'देखें', doneWhen: 'आपका काम पूरा जब', closeDone: 'हो गया — टर्मिनल बंद करें',
    booting: 'टर्मिनल चालू हो रहा है…', termErr: 'टर्मिनल बुझ गया।', useBasic: 'साधारण कमरा इस्तेमाल करें', reviewKick: 'पोर्टल पाठ', reviewFix: 'कहाँ चूक हुई', mins: '~{n} मिनट',
    findVideo: 'सबसे अच्छा वीडियो ढूँढ रहे हैं…', openYT: 'YouTube पर खोलें', search: 'खोजें',
    fix: 'सुधार', firstTry: 'पहली बार में! +50', cleared: 'कमरा {n} पूरा', fell: 'आप गिर गए।', fellSub: 'कमरा फिर से शुरू करें — कुछ नहीं खोया।', restart: 'कमरा फिर शुरू करें',
    map: 'नक़्शा', here: 'आप यहाँ हैं', next: 'आगे', done: 'पूरा', skipped: 'पहले से पता', locked: 'आगे', tSecret: 'गुप्त', tElite: 'एलीट', tBoss: 'बॉस', tFinal: 'अंतिम बॉस', close: 'बंद करें',
    pause: 'रुका हुआ', resume: 'जारी रखें', quit: 'मुख्य स्क्रीन', settings: 'सेटिंग्स', music: 'संगीत', sfx: 'ध्वनि प्रभाव', glide: 'ऑटो-ग्लाइड (फ़ोन जैसा)', ytKey: 'YouTube API key (वैकल्पिक — 8 असली वीडियो में से सबसे अच्छा)',
    resetSave: 'सेव मिटाएँ', resetConfirm: 'मिटाने के लिए फिर टैप करें', on: 'चालू', off: 'बंद', controls: 'तीर / WASD चलें · E इस्तेमाल · 1–4 वार · M नक़्शा · G ऑटो-वॉक · Esc रोकें',
    statsTitle: 'मंज़िल {n} पूरी', sFirst: 'पहली बार में हराए राक्षस', sSecrets: 'मिले रहस्य', sTime: 'समय बनाम लक्ष्य', sScore: 'मंज़िल स्कोर', sRank: 'रैंक', sBadges: 'नए बैज', sContinue: 'जारी रखें', sSkip: 'छोड़ें',
    portalOpen: 'पोर्टल आपको कमरा {n} में खींच रहा है।', secretFound: 'रहस्य मिला! +500', wallHolds: 'दीवार नहीं टूटी। सामान्य रास्ते से चलें।', bossDown: 'बॉस हारा! +1000', crackSpot: 'दरार वाली दीवार! 3 छोटे सवालों के जवाब दें और 5 कमरे छोड़ें।', tryIt: 'आज़माएँ', notNow: 'अभी नहीं',
    victory: 'क़िला फ़तह', vSub: 'आपने {fort} के सभी 20 कमरे पार किए।', newFort: 'नया क़िला बनाएँ', totalScore: 'कुल स्कोर', totalTime: 'समय',
    hits: 'वार', elite: 'एलीट', boss: 'बॉस', dummy: 'अभ्यास डमी', secretQ: 'गुप्त दीवार', hitOf: 'वार {a} / {b}',
    green: 'हरी', blue: 'नीली', gold: 'सुनहरी', red: 'लाल', violet: 'बैंगनी',
    ember: 'अंगार', frost: 'हिम', venom: 'विष', arc: 'बिजली',
    bFirst: 'पहला कमरा', bUntouch: 'अछूता', bSecret: 'रहस्य खोजी', bPortal: 'पोर्टल विजेता', bStreak: '3 दिन लगातार', bFort: 'क़िला फ़तह', badge: 'बैज',
    noSave: 'इस ब्राउज़र मोड में प्रगति सेव नहीं हो सकती।', saveCorrupt: 'पुराना सेव पढ़ा नहीं जा सका, नई शुरुआत की।', liftRise: 'लिफ़्ट मंज़िल {n} पर जा रही है', enterKey: 'शुरू करने के लिए कोई भी कुंजी दबाएँ या टैप करें', mute: 'आवाज़ बंद', unmute: 'आवाज़ चालू', loadingFort: 'क़िला पढ़ रहे हैं…'
  },
  hl: {
    tagline: 'Sab square one se start karte hain. Wahan koi nahi rukta.',
    ask: 'Aap kya seekhna chahte ho?', placeholder: 'Koi bhi skill likho — jaise Python, Excel', build: 'Mera fort banao', orPick: 'Ya ek chuno',
    language: 'Language', cont: 'Continue karo', sample: 'Sample fort khelo (offline)', demo14: 'Demo save: room 14',
    aiOff: 'Yahan AI available nahi hai. Sample Python fort offline chalta hai.', errEmpty: 'Pehle koi skill likho.', errBad: 'Isse fort nahi ban sakta. Koi aur skill try karo.',
    warmup: 'Warm-up', warmSub: 'Teeno dummies ko hit karo aur seedha floor 2 se start karo.', dummies: 'Dummies aa rahe hain…', noDummies: 'Aaj dummies nahi — fort almost ready hai.',
    building: 'Aapka fort ban raha hai', b1: 'Architect se pooch rahe hain', b2: '20 rooms bana rahe hain', b3: 'Har room check kar rahe hain', b4: 'Mashaalein jala rahe hain', b5: 'Fort ready',
    almost: 'Fort almost ready…', warmAll: '3 mein se 3! Lift aapko floor 2 le jayegi.', warmSome: '3 mein se {n}. Aap Square One se start karoge.',
    buildFail: 'Architect ka naksha kho gaya.', retry: 'Phir try karo', back: 'Wapas',
    oStart: '{color} key lo: {title} poora karo', oTerm: 'Terminal tak chalo.', oRead: 'Terminal padho, phir band karo.',
    oFight: '{name} pe sahi weapon chalao.', oKey: '{color} keycard uthao.', oDoor: 'Darwaza khula hai. Aage badho.', oLift: 'Lift khuli hai. Floor {n} pe jao.',
    oElite: 'Ek elite monster raasta roke khada hai. {name} ko harao.', oBoss: '{name} ko harao: {n} hits.', oSecret: 'Secret raasta! Room {n} tak skip karo.',
    oReview: 'Portal lesson: room {n} ki galti theek karo.', oPortal: 'Portal se room {n} wapas jao.', oWarm: 'Fort banne tak dummies pe shoot karo.',
    oWait: 'Fort ka wait…', oExitWarm: 'Lift lo.',
    floor: 'Floor', room: 'Room', of: 'of', health: 'Health', armour: 'Armour', days: 'din', day: 'din', keys: 'Keys', score: 'Score', combo: 'Combo', floorDone: 'Floor {n} done',
    pTerm: 'Terminal kholo', pCrack: 'Crack wali deewar chhuo', pLocked: 'Locked hai. {color} keycard chahiye.', pGlide: 'Auto-walk',
    terminal: 'Terminal', why: 'Yeh kyun zaroori hai', doNow: 'Abhi yeh karo', watch: 'Dekho', doneWhen: 'Kaam poora jab', closeDone: 'Ho gaya — terminal band karo',
    booting: 'Terminal on ho raha hai…', termErr: 'Terminal bujh gaya.', useBasic: 'Basic room use karo', reviewKick: 'Portal lesson', reviewFix: 'Galti kahan hui', mins: '~{n} min',
    findVideo: 'Best video dhoondh rahe hain…', openYT: 'YouTube pe kholo', search: 'Search',
    fix: 'Fix', firstTry: 'Pehli baar mein! +50', cleared: 'Room {n} clear', fell: 'Aap gir gaye.', fellSub: 'Room restart karo — kuch nahi khoya.', restart: 'Room restart karo',
    map: 'Map', here: 'Aap yahan ho', next: 'Aage', done: 'Done', skipped: 'Pata hai', locked: 'Aage', tSecret: 'Secret', tElite: 'Elite', tBoss: 'Boss', tFinal: 'Final boss', close: 'Band karo',
    pause: 'Paused', resume: 'Resume', quit: 'Title pe jao', settings: 'Settings', music: 'Music', sfx: 'Sound effects', glide: 'Auto-glide (phone jaisa)', ytKey: 'YouTube API key (optional — 8 real videos mein se best)',
    resetSave: 'Save mitao', resetConfirm: 'Mitane ke liye phir tap karo', on: 'On', off: 'Off', controls: 'Arrows / WASD chalo · E use · 1–4 fire · M map · G auto-walk · Esc pause',
    statsTitle: 'Floor {n} clear', sFirst: 'Pehli baar mein haraaye monsters', sSecrets: 'Mile secrets', sTime: 'Time vs par', sScore: 'Floor score', sRank: 'Rank', sBadges: 'Naye badges', sContinue: 'Continue', sSkip: 'Skip',
    portalOpen: 'Portal aapko room {n} mein kheench raha hai.', secretFound: 'Secret mila! +500', wallHolds: 'Deewar nahi tooti. Normal raaste se chalo.', bossDown: 'Boss haara! +1000', crackSpot: 'Crack wali deewar! 3 quick sawaal karo aur 5 rooms skip karo.', tryIt: 'Try karo', notNow: 'Abhi nahi',
    victory: 'Fort Conquered', vSub: 'Aapne {fort} ke saare 20 rooms paar kiye.', newFort: 'Naya fort banao', totalScore: 'Total score', totalTime: 'Time',
    hits: 'hits', elite: 'Elite', boss: 'Boss', dummy: 'Practice dummy', secretQ: 'Secret deewar', hitOf: 'Hit {a} of {b}',
    green: 'green', blue: 'blue', gold: 'gold', red: 'red', violet: 'violet',
    ember: 'Ember', frost: 'Frost', venom: 'Venom', arc: 'Arc',
    bFirst: 'First Room', bUntouch: 'Untouchable', bSecret: 'Secret Hunter', bPortal: 'Portal Survivor', bStreak: '3-Day Streak', bFort: 'Fort Conquered', badge: 'Badge',
    noSave: 'Is browser mode mein progress save nahi hoga.', saveCorrupt: 'Purana save padha nahi gaya, fresh start kiya.', liftRise: 'Lift floor {n} pe ja rahi hai', enterKey: 'Start karne ke liye koi bhi key dabao ya tap karo', mute: 'Mute', unmute: 'Unmute', loadingFort: 'Fort padh rahe hain…'
  }
};
SQ._loaded = Object.assign(SQ._loaded || {}, { data: true });
})();
