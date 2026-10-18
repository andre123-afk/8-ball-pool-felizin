import javax.swing.*;
import java.awt.*;
import java.awt.event.*;
import java.awt.font.TextLayout;
import java.awt.geom.*;
import java.awt.image.BufferedImage;
import java.io.*;
import java.net.*;
import java.util.*;
import java.util.List;

/** 8 Ball Pool: compilar con "javac Pool8.java" y ejecutar con "java Pool8" (JDK 17+). */
public class Pool8 extends JPanel implements MouseListener, MouseMotionListener {
    // ======================= CONSTANTES =======================
    static final int W = 1180, H = 700;
    static final int TX = 135, TY = 140, TW = 860, TH = 430, R = 12, PORT = 5555;
    static final long START_COINS = 1_100_000L; // monedas iniciales (cámbialo si quieres)
    static final int AIM = 0, MOVE = 1, PLACE = 2, OVER = 3;

    static class Tbl {
        String name; long bet; Color felt, wood, trim; boolean call; int tier;
        Tbl(String n, long b, Color f, Color w, Color t, boolean c, int ti) { name = n; bet = b; felt = f; wood = w; trim = t; call = c; tier = ti; }
    }
    static final Tbl[] T = {
        new Tbl("Mesa Verde", 100, new Color(24, 128, 66), new Color(104, 60, 28), new Color(200, 160, 80), false, 0),
        new Tbl("Mesa Azul", 500, new Color(30, 100, 180), new Color(66, 44, 32), new Color(190, 195, 205), true, 1),
        new Tbl("Mesa Roja", 2000, new Color(165, 36, 48), new Color(44, 32, 30), new Color(230, 190, 70), true, 2),
        new Tbl("Felizin", 1_000_000, new Color(92, 36, 138), new Color(172, 130, 30), new Color(255, 232, 130), true, 3)
    };
    static final String[] TIER = {"Bronce", "Plata", "Oro", "Diamante"};
    static final Color[] TIERC = {new Color(205, 127, 50), new Color(205, 210, 220), new Color(255, 200, 40), new Color(110, 220, 255)};

    static class Cue {
        String name; Color a, b; int f, e, aim, need;
        Cue(String n, Color a, Color b, int f, int e, int aim, int need) { name = n; this.a = a; this.b = b; this.f = f; this.e = e; this.aim = aim; this.need = need; }
    }
    static final Cue[] CUES = {
        new Cue("Clásico", new Color(238, 202, 142), new Color(122, 72, 32), 0, 0, 0, 0),
        new Cue("Ébano", new Color(96, 76, 70), new Color(16, 12, 12), 1, 1, 1, 5),
        new Cue("Fuego", new Color(255, 176, 40), new Color(190, 30, 10), 2, 1, 1, 6),
        new Cue("Hielo", new Color(224, 246, 255), new Color(70, 140, 220), 1, 3, 2, 6),
        new Cue("Dorado", new Color(255, 228, 112), new Color(170, 120, 20), 3, 2, 2, 8),
        new Cue("Galaxia", new Color(140, 80, 230), new Color(20, 200, 230), 4, 3, 3, 10)
    };

    static final Color[] BC = {Color.WHITE, new Color(255, 205, 0), new Color(0, 60, 180), new Color(220, 30, 30),
            new Color(90, 30, 140), new Color(240, 120, 0), new Color(0, 120, 50), new Color(130, 20, 20), new Color(20, 20, 20)};
    static final double[][] P = {{TX - 4, TY - 4}, {TX + TW / 2.0, TY - 16}, {TX + TW + 4, TY - 4},
            {TX - 4, TY + TH + 4}, {TX + TW / 2.0, TY + TH + 16}, {TX + TW + 4, TY + TH + 4}};
    static double prad(int i) { return (i == 1 || i == 4) ? 22 : 24; }

    // zonas de la interfaz de partida
    static final int TRX = 1052, TRW = 34, TRY = TY - 6, TRH = TH + 12;
    static final Rectangle SLR = new Rectangle(22, TY, 40, TH), PMR = new Rectangle(1106, TY + 32, 40, TH - 48);
    static final Rectangle MENUB = new Rectangle(14, 14, 50, 50), EMB = new Rectangle(16, 616, 48, 48), CUEB = new Rectangle(1089, 92, 52, 52);
    static final Rectangle[] AV = {new Rectangle(500, 10, 58, 58), new Rectangle(642, 10, 58, 58)};
    static final int SPX = 1115, SPY = 46, SPR = 30;

    // ======================= PERFIL / DATOS GUARDADOS =======================
    static class Profile {
        String name = "Jugador"; int level = 1, xp = 0, games = 0, wins = 0, streak = 0, best = 0, cue = 0; long earned = 0;
        int need() { return 80 + level * 40; }
        void load(Properties p, String k) {
            name = p.getProperty(k + "name", name); level = Integer.parseInt(p.getProperty(k + "level", "" + level));
            xp = Integer.parseInt(p.getProperty(k + "xp", "" + xp)); games = Integer.parseInt(p.getProperty(k + "games", "" + games));
            wins = Integer.parseInt(p.getProperty(k + "wins", "" + wins)); streak = Integer.parseInt(p.getProperty(k + "streak", "" + streak));
            best = Integer.parseInt(p.getProperty(k + "best", "" + best)); cue = Integer.parseInt(p.getProperty(k + "cue", "" + cue));
            earned = Long.parseLong(p.getProperty(k + "earned", "" + earned));
        }
        void store(Properties p, String k) {
            p.setProperty(k + "name", name); p.setProperty(k + "level", "" + level); p.setProperty(k + "xp", "" + xp);
            p.setProperty(k + "games", "" + games); p.setProperty(k + "wins", "" + wins); p.setProperty(k + "streak", "" + streak);
            p.setProperty(k + "best", "" + best); p.setProperty(k + "cue", "" + cue); p.setProperty(k + "earned", "" + earned);
        }
        /** Suma una partida; devuelve cuántos niveles subió. */
        int record(boolean won, int tbl) {
            games++;
            int gain;
            if (won) { wins++; streak++; best = Math.max(best, streak); gain = 100 + tbl * 50 + Math.min(streak, 5) * 10; }
            else { streak = 0; gain = 35; }
            xp += gain; int ups = 0;
            while (xp >= need()) { xp -= need(); level++; ups++; }
            return ups;
        }
    }
    static Profile self = new Profile(), guest = new Profile();
    static { guest.name = "Jugador 2"; }
    static long coins = START_COINS, lastGift = -1;
    static boolean named = false;
    static final List<Integer> boxes = new ArrayList<>();
    static final int[] pieces = new int[CUES.length];
    static final List<String[]> friends = new ArrayList<>();
    static JFrame frame;

    static boolean owned(int i) { return i == 0 || pieces[i] >= CUES[i].need; }
    static File saveFile() { return new File(System.getProperty("user.home"), ".pool8save"); }

    static void load() {
        Properties p = new Properties();
        try (FileInputStream f = new FileInputStream(saveFile())) { p.load(f); } catch (Exception e) { return; }
        try {
            named = p.getProperty("named") != null;
            coins = Long.parseLong(p.getProperty("coins", "" + START_COINS)); lastGift = Long.parseLong(p.getProperty("gift", "-1"));
            self.load(p, "me."); guest.load(p, "g.");
            boxes.clear();
            for (String s : p.getProperty("boxes", "").split(",")) if (!s.isEmpty()) boxes.add(Integer.parseInt(s));
            String[] pc = p.getProperty("pieces", "").split(",");
            for (int i = 0; i < pc.length && i < pieces.length; i++) if (!pc[i].isEmpty()) pieces[i] = Integer.parseInt(pc[i]);
            friends.clear();
            for (String s : p.getProperty("friends", "").split(";")) { String[] f = s.split("@"); if (f.length == 2) friends.add(f); }
            if (!owned(self.cue)) self.cue = 0;
        } catch (Exception e) { }
    }
    static void save() {
        Properties p = new Properties();
        p.setProperty("named", "1"); p.setProperty("coins", "" + coins); p.setProperty("gift", "" + lastGift);
        self.store(p, "me."); guest.store(p, "g.");
        StringBuilder b = new StringBuilder(); for (int x : boxes) b.append(x).append(","); p.setProperty("boxes", b.toString());
        b = new StringBuilder(); for (int x : pieces) b.append(x).append(","); p.setProperty("pieces", b.toString());
        b = new StringBuilder(); for (String[] f : friends) b.append(f[0]).append("@").append(f[1]).append(";"); p.setProperty("friends", b.toString());
        try (FileOutputStream o = new FileOutputStream(saveFile())) { p.store(o, "Pool8"); } catch (Exception e) { }
    }
    static String clean(String s) { s = s.replaceAll("[,;@\\n\\r]", "").trim(); return s.length() > 14 ? s.substring(0, 14) : s.isEmpty() ? "Jugador" : s; }
    static String fmt(long n) { return String.format("%,d", n); }

    // ======================= UTILIDADES DE DIBUJO =======================
    static void aa(Graphics2D g) {
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
        g.setRenderingHint(RenderingHints.KEY_STROKE_CONTROL, RenderingHints.VALUE_STROKE_PURE);
    }
    static Color mix(Color a, Color b, double t) {
        return new Color((int) (a.getRed() + (b.getRed() - a.getRed()) * t), (int) (a.getGreen() + (b.getGreen() - a.getGreen()) * t), (int) (a.getBlue() + (b.getBlue() - a.getBlue()) * t));
    }
    static void txt(Graphics2D g, String s, int x, int y, Font f, Color c, int align) {
        g.setFont(f); int w = g.getFontMetrics().stringWidth(s);
        int px = align == 1 ? x - w / 2 : align == 2 ? x - w : x;
        g.setColor(new Color(0, 0, 0, 120)); g.drawString(s, px + 1, y + 1);
        g.setColor(c); g.drawString(s, px, y);
    }
    static final Font F12 = new Font("SansSerif", Font.PLAIN, 12), F12B = new Font("SansSerif", Font.BOLD, 12),
            F14B = new Font("SansSerif", Font.BOLD, 14), F16B = new Font("SansSerif", Font.BOLD, 16), F20B = new Font("SansSerif", Font.BOLD, 20);

    static void drawBall(Graphics2D g, double x, double y, int id, double r) {
        Shape old = g.getClip();
        Ellipse2D el = new Ellipse2D.Double(x - r, y - r, 2 * r, 2 * r);
        g.setColor(new Color(0, 0, 0, 85)); g.fill(new Ellipse2D.Double(x - r + r * .22, y - r + r * .32, 2 * r, 2 * r));
        Color c = id == 0 ? new Color(250, 250, 244) : BC[id > 8 ? id - 8 : id];
        g.setColor(id > 8 || id == 0 ? new Color(250, 250, 244) : c); g.fill(el);
        if (id > 8) { g.setClip(el); g.setColor(c); g.fillRect((int) (x - r), (int) (y - r * .58), (int) (2 * r) + 1, (int) (r * 1.16)); g.setClip(old); }
        if (id > 0) {
            g.setColor(new Color(250, 250, 244)); g.fill(new Ellipse2D.Double(x - r * .48, y - r * .48, r * .96, r * .96));
            g.setColor(Color.BLACK); g.setFont(new Font("SansSerif", Font.BOLD, Math.max(6, (int) (r * .72))));
            String s = "" + id; g.drawString(s, (float) (x - g.getFontMetrics().stringWidth(s) / 2.0), (float) (y + r * .27));
        }
        g.setPaint(new RadialGradientPaint(new Point2D.Double(x - r * .35, y - r * .4), (float) (r * 1.55), new float[]{0f, .5f, 1f},
                new Color[]{new Color(255, 255, 255, 190), new Color(255, 255, 255, 0), new Color(0, 0, 0, 120)}));
        g.fill(el);
    }

    static void drawCueShape(Graphics2D g, double bx, double by, double tx, double ty, Cue c, double wb, double wt) {
        double dx = tx - bx, dy = ty - by, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len, px = -uy, py = ux;
        Path2D body = new Path2D.Double();
        body.moveTo(bx + px * wb, by + py * wb); body.lineTo(tx + px * wt, ty + py * wt); body.lineTo(tx - px * wt, ty - py * wt); body.lineTo(bx - px * wb, by - py * wb); body.closePath();
        g.setPaint(new GradientPaint((float) tx, (float) ty, c.a, (float) bx, (float) by, c.b)); g.fill(body);
        g.setStroke(new BasicStroke(2f));
        for (int k = 0; k < 3; k++) {
            double t = .10 + k * .035, w = wb + (wt - wb) * t, cx = bx + dx * t, cy = by + dy * t;
            g.setColor(k == 1 ? Color.WHITE : mix(c.a, Color.WHITE, .4)); g.draw(new Line2D.Double(cx + px * w, cy + py * w, cx - px * w, cy - py * w));
        }
        g.setColor(new Color(255, 255, 255, 70)); g.setStroke(new BasicStroke(1f));
        g.draw(new Line2D.Double(bx + px * wb * .45, by + py * wb * .45, tx + px * wt * .45, ty + py * wt * .45));
        g.setStroke(new BasicStroke((float) (wt * 2 + .5), BasicStroke.CAP_BUTT, BasicStroke.JOIN_MITER));
        g.setColor(new Color(245, 245, 235)); g.draw(new Line2D.Double(bx + dx * .955, by + dy * .955, bx + dx * .985, by + dy * .985));
        g.setColor(new Color(60, 140, 220)); g.draw(new Line2D.Double(bx + dx * .985, by + dy * .985, tx, ty));
    }

    static void star(Graphics2D g, double cx, double cy, double r, int lvl) {
        Path2D p = new Path2D.Double();
        for (int k = 0; k < 10; k++) {
            double a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 == 0 ? r : r * .48, x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
            if (k == 0) p.moveTo(x, y); else p.lineTo(x, y);
        }
        p.closePath();
        g.setPaint(new GradientPaint((float) cx, (float) (cy - r), new Color(255, 236, 120), (float) cx, (float) (cy + r), new Color(220, 150, 20))); g.fill(p);
        g.setColor(new Color(90, 55, 0)); g.setStroke(new BasicStroke(1.2f)); g.draw(p);
        txt(g, "" + lvl, (int) cx, (int) (cy + r * .32), new Font("SansSerif", Font.BOLD, (int) Math.max(8, r * .8)), Color.WHITE, 1);
    }

    static void drawAvatar(Graphics2D g, int x, int y, int s, Profile p) {
        float hue = (Math.abs(p.name.hashCode()) % 360) / 360f;
        g.setPaint(new GradientPaint(x, y, Color.getHSBColor(hue, .5f, 1f), x, y + s, Color.getHSBColor(hue, .85f, .42f)));
        g.fillRoundRect(x, y, s, s, s / 4, s / 4);
        g.setColor(new Color(255, 255, 255, 210)); g.setStroke(new BasicStroke(2f)); g.drawRoundRect(x, y, s, s, s / 4, s / 4);
        txt(g, p.name.substring(0, 1).toUpperCase(), x + s / 2, y + s / 2 + s / 6, new Font("SansSerif", Font.BOLD, s * 5 / 9), Color.WHITE, 1);
        star(g, x + s - 4, y + s - 4, Math.max(10, s * .24), p.level);
    }

    static void drawFlame(Graphics2D g, double x, double y, double s) {
        Path2D p = new Path2D.Double();
        p.moveTo(x, y - s); p.curveTo(x + s * .9, y - s * .3, x + s * .8, y + s * .8, x, y + s * .9);
        p.curveTo(x - s * .8, y + s * .8, x - s * .9, y - s * .1, x - s * .2, y - s * .5);
        p.curveTo(x - s * .1, y - s * .2, x + s * .1, y - s * .4, x, y - s); p.closePath();
        g.setPaint(new GradientPaint((float) x, (float) (y - s), new Color(255, 230, 80), (float) x, (float) (y + s), new Color(240, 60, 10))); g.fill(p);
    }

    static void drawCoin(Graphics2D g, double cx, double cy, double r) {
        g.setPaint(new GradientPaint((float) cx, (float) (cy - r), new Color(255, 236, 120), (float) cx, (float) (cy + r), new Color(214, 140, 10)));
        g.fill(new Ellipse2D.Double(cx - r, cy - r, 2 * r, 2 * r));
        g.setColor(new Color(150, 90, 0)); g.setStroke(new BasicStroke(1.5f)); g.draw(new Ellipse2D.Double(cx - r, cy - r, 2 * r, 2 * r));
        g.draw(new Ellipse2D.Double(cx - r * .65, cy - r * .65, r * 1.3, r * 1.3));
    }

    static void drawBox(Graphics2D g, int x, int y, int w, int h, Color tier) {
        g.setColor(new Color(0, 0, 0, 90)); g.fillRoundRect(x + 3, y + h / 5 + 3, w, h * 4 / 5, 10, 10);
        g.setPaint(new GradientPaint(x, y, new Color(110, 112, 120), x, y + h, new Color(40, 42, 48))); g.fillRoundRect(x, y + h / 5, w, h * 4 / 5, 10, 10);
        g.setPaint(new GradientPaint(x, y, mix(tier, Color.WHITE, .4), x, y + h / 4, mix(tier, Color.BLACK, .3))); g.fillRoundRect(x - 2, y, w + 4, h / 3, 10, 10);
        g.setColor(new Color(255, 255, 255, 120)); g.setStroke(new BasicStroke(1.5f)); g.drawRoundRect(x, y + h / 5, w, h * 4 / 5, 10, 10);
        drawBall(g, x + w / 2.0, y + h * .62, 8, Math.min(w, h) * .2);
    }

    static void drawFace(Graphics2D g, double cx, double cy, double r, int k) {
        Color base = k == 3 ? new Color(240, 90, 60) : k == 4 ? new Color(120, 170, 240) : k == 5 ? new Color(40, 110, 220) : new Color(255, 210, 50);
        g.setPaint(new GradientPaint((float) cx, (float) (cy - r), mix(base, Color.WHITE, .5), (float) cx, (float) (cy + r), mix(base, Color.BLACK, .25)));
        g.fill(new Ellipse2D.Double(cx - r, cy - r, 2 * r, 2 * r));
        g.setColor(new Color(60, 35, 0)); g.setStroke(new BasicStroke((float) (r * .09), BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND)); g.draw(new Ellipse2D.Double(cx - r, cy - r, 2 * r, 2 * r));
        double ex = r * .38, ey = r * .2, er = r * .1;
        switch (k) {
            case 0: g.fill(new Ellipse2D.Double(cx - ex - er, cy - ey - er, er * 2, er * 2)); g.fill(new Ellipse2D.Double(cx + ex - er, cy - ey - er, er * 2, er * 2));
                g.draw(new Arc2D.Double(cx - r * .5, cy - r * .3, r, r * .9, 200, 140, Arc2D.OPEN)); break;
            case 1: g.draw(new Arc2D.Double(cx - ex - er * 1.4, cy - ey - er, er * 2.8, er * 2, 0, 180, Arc2D.OPEN)); g.draw(new Arc2D.Double(cx + ex - er * 1.4, cy - ey - er, er * 2.8, er * 2, 0, 180, Arc2D.OPEN));
                g.setColor(new Color(120, 20, 20)); g.fill(new Arc2D.Double(cx - r * .5, cy - r * .1, r, r * .75, 180, 180, Arc2D.CHORD)); break;
            case 2: g.setColor(Color.BLACK); g.fill(new RoundRectangle2D.Double(cx - r * .72, cy - r * .32, r * .6, r * .36, 6, 6)); g.fill(new RoundRectangle2D.Double(cx + r * .12, cy - r * .32, r * .6, r * .36, 6, 6));
                g.setStroke(new BasicStroke((float) (r * .08))); g.draw(new Line2D.Double(cx - r * .12, cy - r * .22, cx + r * .12, cy - r * .22));
                g.setColor(new Color(60, 35, 0)); g.draw(new Arc2D.Double(cx - r * .45, cy - r * .1, r * .9, r * .7, 200, 140, Arc2D.OPEN)); break;
            case 3: g.fill(new Ellipse2D.Double(cx - ex - er, cy - ey * .4 - er, er * 2, er * 2)); g.fill(new Ellipse2D.Double(cx + ex - er, cy - ey * .4 - er, er * 2, er * 2));
                g.draw(new Line2D.Double(cx - ex - r * .2, cy - r * .5, cx - ex + r * .15, cy - r * .3)); g.draw(new Line2D.Double(cx + ex + r * .2, cy - r * .5, cx + ex - r * .15, cy - r * .3));
                g.draw(new Arc2D.Double(cx - r * .4, cy + r * .2, r * .8, r * .5, 20, 140, Arc2D.OPEN)); break;
            case 4: g.fill(new Ellipse2D.Double(cx - ex - er, cy - ey - er, er * 2, er * 2)); g.fill(new Ellipse2D.Double(cx + ex - er, cy - ey - er, er * 2, er * 2));
                g.draw(new Arc2D.Double(cx - r * .4, cy + r * .25, r * .8, r * .5, 20, 140, Arc2D.OPEN));
                g.setColor(new Color(80, 160, 255)); g.fill(new Ellipse2D.Double(cx + ex - er * .6, cy + r * .05, er * 1.2, er * 2)); break;
            default: txt(g, "GG", (int) cx, (int) (cy + r * .3), new Font("SansSerif", Font.BOLD, (int) (r * .95)), Color.WHITE, 1);
        }
    }

    // ======================= JUEGO =======================
    static class Ball { double x, y, vx, vy, sp, ss; int id; boolean alive = true; Ball(int i) { id = i; } }

    final Ball[] balls = new Ball[16];
    final List<Integer> potted = new ArrayList<>(), tray = new ArrayList<>();
    final int mode, tbl, me; // mode 0 local, 1 anfitrión, 2 invitado
    final Profile[] pl = new Profile[2];
    final int[] cueOf = new int[2], emote = {-1, -1};
    final long[] emoteT = new long[2];
    int turn = 0, state = AIM, firstHit = -1, pocket8 = -1, called = -1;
    final int[] grp = {-1, -1};
    boolean clearBefore, dragging, spinDrag, emoteOpen, broke;
    double ang = 0, power = 0, sx = 0, sy = 0, dx0, dy0, mx, my;
    String msg = "¡Rompe la mesa!", rivalIp;
    Socket sock; PrintWriter out;
    BufferedImage bg;
    javax.swing.Timer timer;

    Pool8(int mode, int tbl, long seed, Socket s, BufferedReader in) {
        this.mode = mode; this.tbl = tbl; this.me = mode == 2 ? 1 : 0;
        setPreferredSize(new Dimension(W, H));
        pl[me] = self;
        if (mode == 0) pl[1] = guest; else { Profile r = new Profile(); r.name = "Rival"; pl[1 - me] = r; }
        cueOf[me] = self.cue; cueOf[1 - me] = pl[1 - me].cue;
        for (int i = 0; i < 16; i++) balls[i] = new Ball(i);
        balls[0].x = TX + TW * 0.25; balls[0].y = TY + TH / 2.0;
        // triángulo: 8 en el centro, una lisa y una rayada en las esquinas de atrás
        Random rnd = new Random(seed);
        List<Integer> sol = new ArrayList<>(), str = new ArrayList<>();
        for (int i = 1; i <= 7; i++) sol.add(i);
        for (int i = 9; i <= 15; i++) str.add(i);
        Collections.shuffle(sol, rnd); Collections.shuffle(str, rnd);
        int[] order = new int[15];
        order[10] = sol.remove(0); order[14] = str.remove(0); order[4] = 8;
        List<Integer> rest = new ArrayList<>(sol); rest.addAll(str); Collections.shuffle(rest, rnd);
        int ri = 0; for (int i = 0; i < 15; i++) if (order[i] == 0) order[i] = rest.get(ri++);
        int n = 0;
        for (int r = 0; r < 5; r++) for (int k = 0; k <= r; k++) {
            Ball b = balls[order[n++]];
            b.x = TX + TW * 0.72 + r * (2 * R * 0.866 + 0.3);
            b.y = TY + TH / 2.0 + (k - r / 2.0) * (2 * R + 0.3);
        }
        coins = Math.max(0, coins - T[tbl].bet); save();
        addMouseListener(this); addMouseMotionListener(this);
        timer = new javax.swing.Timer(16, e -> {
            if (state == MOVE) { step(); if (!moving()) endShot(); }
            repaint();
        });
        timer.start();
        if (s != null) {
            sock = s;
            try { out = new PrintWriter(s.getOutputStream(), true); rivalIp = s.getInetAddress().getHostAddress(); } catch (IOException ex) { }
            send("P," + clean(self.name) + "," + self.level + "," + self.games + "," + self.wins + "," + self.earned + "," + self.streak + "," + self.best + "," + self.cue);
            new Thread(() -> {
                try { String l; while ((l = in.readLine()) != null) { final String m = l; SwingUtilities.invokeLater(() -> onMsg(m)); } } catch (IOException ex) { }
                SwingUtilities.invokeLater(() -> onMsg("D"));
            }).start();
        }
    }

    void send(String s) { if (out != null) out.println(s); }
    static int grpOf(int id) { return id == 8 ? -2 : id < 8 ? 0 : 1; }
    int remaining(int g) { int c = 0; for (int i = 1; i < 16; i++) if (balls[i].alive && grpOf(i) == g) c++; return c; }
    boolean mine() { return mode == 0 || turn == me; }
    boolean needCall() { return T[tbl].call && grp[turn] >= 0 && remaining(grp[turn]) == 0 && balls[8].alive; }
    boolean moving() { for (Ball b : balls) if (b.alive && (b.vx != 0 || b.vy != 0)) return true; return false; }

    // ---------------- FÍSICA (determinista: igual en todos los clientes) ----------------
    boolean mouth(Ball b) { // cerca de una tronera y yendo hacia ella: la banda deja pasar la bola
        for (int i = 0; i < 6; i++) {
            double d = StrictMath.hypot(b.x - P[i][0], b.y - P[i][1]);
            if (d < (i == 1 || i == 4 ? 38 : 40) && (P[i][0] - b.x) * b.vx + (P[i][1] - b.y) * b.vy > 0) return true;
        }
        return false;
    }

    void step() {
        for (int s = 0; s < 4; s++) {
            for (Ball b : balls) if (b.alive) { b.x += b.vx; b.y += b.vy; }
            for (Ball b : balls) {
                if (!b.alive) continue;
                for (int i = 0; i < 6; i++)
                    if (StrictMath.hypot(b.x - P[i][0], b.y - P[i][1]) < prad(i)) {
                        b.alive = false; b.vx = b.vy = 0; potted.add(b.id); if (b.id == 8) pocket8 = i; break;
                    }
                if (!b.alive || mouth(b)) continue;
                if (b.x < TX + R) { b.x = TX + R; b.vx = Math.abs(b.vx) * .8; b.vy += b.ss * b.vx * .15; b.ss *= .6; }
                if (b.x > TX + TW - R) { b.x = TX + TW - R; b.vx = -Math.abs(b.vx) * .8; b.vy -= b.ss * b.vx * .15; b.ss *= .6; }
                if (b.y < TY + R) { b.y = TY + R; b.vy = Math.abs(b.vy) * .8; b.vx -= b.ss * b.vy * .15; b.ss *= .6; }
                if (b.y > TY + TH - R) { b.y = TY + TH - R; b.vy = -Math.abs(b.vy) * .8; b.vx += b.ss * b.vy * .15; b.ss *= .6; }
            }
            for (int i = 0; i < 16; i++) for (int j = i + 1; j < 16; j++) {
                Ball a = balls[i], b = balls[j];
                if (!a.alive || !b.alive) continue;
                double dx = b.x - a.x, dy = b.y - a.y, d = StrictMath.hypot(dx, dy);
                if (d >= 2 * R || d == 0) continue;
                double nx = dx / d, ny = dy / d, ov = (2 * R - d) / 2;
                a.x -= nx * ov; a.y -= ny * ov; b.x += nx * ov; b.y += ny * ov;
                double rv = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
                if (rv <= 0) continue;
                Ball c = a.id == 0 ? a : b.id == 0 ? b : null;
                double pvx = c == null ? 0 : c.vx, pvy = c == null ? 0 : c.vy, imp = rv * .985; // choque casi elástico
                a.vx -= imp * nx; a.vy -= imp * ny; b.vx += imp * nx; b.vy += imp * ny;
                if (c != null) {
                    if (firstHit < 0) firstHit = c == a ? b.id : a.id;
                    double sp0 = StrictMath.hypot(pvx, pvy);
                    if (sp0 > 0) { c.vx += pvx / sp0 * c.sp * rv * .5; c.vy += pvy / sp0 * c.sp * rv * .5; } // efecto: seguir / retroceder
                    c.sp = 0;
                }
            }
            for (Ball b : balls) {
                if (!b.alive) continue;
                double sp = StrictMath.hypot(b.vx, b.vy);
                if (sp == 0) continue;
                double n = sp * .9995 - .012;
                if (n < .05) { b.vx = b.vy = 0; } else { b.vx *= n / sp; b.vy *= n / sp; }
            }
        }
        balls[0].sp *= .995; balls[0].ss *= .995;
    }

    void shoot(double a, double pw, double ssx, double ssy, int call, double cx, double cy) {
        Ball c = balls[0];
        c.alive = true; c.x = cx; c.y = cy;
        c.vx = StrictMath.cos(a) * pw * 8; c.vy = StrictMath.sin(a) * pw * 8;
        c.sp = -ssy; c.ss = ssx; called = call; broke = true;
        clearBefore = grp[turn] >= 0 && remaining(grp[turn]) == 0;
        potted.clear(); firstHit = -1; pocket8 = -1; state = MOVE; msg = "";
    }

    void endShot() {
        int m = turn; boolean cueIn = potted.contains(0), p8 = potted.contains(8);
        for (int id : potted) if (id > 0 && id != 8) tray.add(id);
        boolean foul = cueIn || firstHit < 0 || (clearBefore ? firstHit != 8
                : (firstHit == 8 || (grp[m] >= 0 && grpOf(firstHit) != grp[m])));
        if (p8) { finish(clearBefore && !cueIn && (!T[tbl].call || pocket8 == called) ? m : 1 - m, false); return; }
        if (grp[m] < 0 && !foul) for (int id : potted) if (id > 0) { grp[m] = grpOf(id); grp[1 - m] = 1 - grp[m]; break; }
        boolean own = false;
        for (int id : potted) if (id > 0 && grp[m] >= 0 && grpOf(id) == grp[m]) own = true;
        called = -1; state = AIM;
        if (foul) {
            turn = 1 - turn; state = PLACE; msg = "¡Falta! Bola en mano para el jugador " + (turn + 1);
            Ball c = balls[0]; c.alive = true; c.vx = c.vy = 0; c.x = TX + TW * .25; c.y = TY + TH / 2.0;
        } else if (!own) { turn = 1 - turn; msg = ""; }
        else msg = "¡Bien! Sigues tirando";
        if (needCall() && mine()) msg = "Elige la tronera para la bola 8 (clic en ella)";
    }

    void finish(int winner, boolean closeFirst) {
        if (state == OVER) return;
        state = OVER; timer.stop();
        Tbl t = T[tbl];
        boolean iWon = mode == 0 ? winner == 0 : winner == me;
        if (closeFirst) try { if (sock != null) sock.close(); } catch (IOException e) { }
        int ups = self.record(iWon, tbl);
        StringBuilder sb = new StringBuilder("<html><body style='width:300px'>");
        if (mode == 0) sb.append("<h2>¡Gana el jugador ").append(winner + 1).append("!</h2>");
        else sb.append(iWon ? "<h2 style='color:green'>¡HAS GANADO!</h2>" : "<h2 style='color:red'>Has perdido</h2>");
        if (iWon) { coins += t.bet * 2; self.earned += t.bet; boxes.add(t.tier);
            sb.append("+").append(fmt(t.bet * 2)).append(" monedas (ganancia neta ").append(fmt(t.bet)).append(")<br>Caja de ").append(TIER[t.tier]).append(" conseguida<br>"); }
        else sb.append("Pierdes ").append(fmt(t.bet)).append(" monedas<br>");
        sb.append("Experiencia: ").append(iWon ? "+" + (100 + tbl * 50 + Math.min(self.streak, 5) * 10) : "+35").append(" XP<br>");
        if (ups > 0) sb.append("<b>¡Subes al nivel ").append(self.level).append("!</b><br>");
        if (iWon && self.streak >= 2) sb.append("Racha de ").append(self.streak).append(" victorias<br>");
        if (mode == 0) { // el invitado local también acumula experiencia y estadísticas
            int gu = guest.record(winner == 1, tbl);
            sb.append("<br>").append(guest.name).append(": ").append(winner == 1 ? "+victoria" : "+partida").append(gu > 0 ? ", ¡nivel " + guest.level + "!" : "");
        }
        sb.append("<br>Monedas: ").append(fmt(coins));
        save();
        JOptionPane.showMessageDialog(frame, sb.toString(), "Resultado", JOptionPane.PLAIN_MESSAGE);
        try { if (sock != null) sock.close(); } catch (IOException e) { }
        menu();
    }

    void onMsg(String l) {
        if (state == OVER) return;
        if (l.equals("D")) { JOptionPane.showMessageDialog(frame, "Tu rival se desconectó."); finish(mode == 0 ? 0 : me, false); return; }
        String[] p = l.split(",");
        try {
            if (p[0].equals("S") && !mine() && state != MOVE)
                shoot(Double.parseDouble(p[1]), Double.parseDouble(p[2]), Double.parseDouble(p[3]), Double.parseDouble(p[4]),
                        Integer.parseInt(p[5]), Double.parseDouble(p[6]), Double.parseDouble(p[7]));
            else if (p[0].equals("P")) {
                Profile r = pl[1 - me]; r.name = p[1]; r.level = Integer.parseInt(p[2]); r.games = Integer.parseInt(p[3]); r.wins = Integer.parseInt(p[4]);
                r.earned = Long.parseLong(p[5]); r.streak = Integer.parseInt(p[6]); r.best = Integer.parseInt(p[7]); r.cue = Integer.parseInt(p[8]); cueOf[1 - me] = r.cue;
            } else if (p[0].equals("C")) { cueOf[1 - me] = Integer.parseInt(p[1]); pl[1 - me].cue = cueOf[1 - me]; }
            else if (p[0].equals("E")) { emote[1 - me] = Integer.parseInt(p[1]); emoteT[1 - me] = System.currentTimeMillis() + 2800; }
        } catch (Exception ex) { }
    }

    // ---------------- ENTRADA ----------------
    boolean validSpot(double x, double y) {
        if (x < TX + R || x > TX + TW - R || y < TY + R || y > TY + TH - R) return false;
        for (int i = 1; i < 16; i++) if (balls[i].alive && Math.hypot(balls[i].x - x, balls[i].y - y) < 2 * R) return false;
        return true;
    }
    static double emx(int i) { return 100 + i * 50; }
    public void mouseMoved(MouseEvent e) {
        mx = e.getX(); my = e.getY();
        if (state == AIM && mine() && !dragging && mx > TX - 60 && mx < TX + TW + 60) ang = Math.atan2(my - balls[0].y, mx - balls[0].x);
    }
    public void mousePressed(MouseEvent e) {
        mx = e.getX(); my = e.getY();
        if (MENUB.contains(mx, my)) { pauseMenu(); return; }
        for (int p = 0; p < 2; p++) if (AV[p].contains(mx, my)) { showProfile(p); return; }
        if (EMB.contains(mx, my)) { emoteOpen = !emoteOpen; return; }
        if (emoteOpen) {
            emoteOpen = false;
            for (int i = 0; i < 6; i++) if (Math.hypot(mx - emx(i), my - 572) < 24) { int p = mode == 0 ? turn : me; emote[p] = i; emoteT[p] = System.currentTimeMillis() + 2800; send("E," + i); }
            return;
        }
        if (state == MOVE || state == OVER) return;
        if (Math.hypot(mx - SPX, my - SPY) < SPR + 4) { if (mine()) { spinDrag = true; setSpin(); } return; }
        if (CUEB.contains(mx, my)) { if (mine()) pickCue(); return; }
        if (!mine()) return;
        if (needCall()) for (int i = 0; i < 6; i++) if (Math.hypot(mx - P[i][0], my - P[i][1]) < 34) { called = i; msg = ""; return; }
        if (state == PLACE) { if (validSpot(mx, my)) { balls[0].x = mx; balls[0].y = my; state = AIM; msg = ""; } return; }
        dragging = true; dx0 = mx; dy0 = my;
    }
    void setSpin() {
        sx = (mx - SPX) / SPR; sy = (my - SPY) / SPR;
        double l = Math.hypot(sx, sy); if (l > .9) { sx *= .9 / l; sy *= .9 / l; }
    }
    public void mouseDragged(MouseEvent e) {
        mx = e.getX(); my = e.getY();
        if (spinDrag) setSpin();
        if (dragging) power = Math.max(0, Math.min(1, -((mx - dx0) * Math.cos(ang) + (my - dy0) * Math.sin(ang)) / 220));
    }
    public void mouseReleased(MouseEvent e) {
        spinDrag = false;
        if (!dragging) return;
        dragging = false;
        if (power > .03) {
            if (needCall() && called < 0) msg = "¡Antes debes elegir la tronera de la 8!";
            else {
                Ball c = balls[0]; Cue cu = CUES[cueOf[turn]];
                double pw = power * (1 + .02 * cu.f), ssx = sx * (1 + .06 * cu.e), ssy = sy * (1 + .06 * cu.e); // el taco mejora fuerza y efecto
                send("S," + ang + "," + pw + "," + ssx + "," + ssy + "," + called + "," + c.x + "," + c.y);
                shoot(ang, pw, ssx, ssy, called, c.x, c.y);
                sx = 0; sy = 0; // la bola de efecto vuelve al centro en cada tiro
            }
        }
        power = 0;
    }
    public void mouseClicked(MouseEvent e) { }
    public void mouseEntered(MouseEvent e) { }
    public void mouseExited(MouseEvent e) { }

    void pickCue() {
        int p = mode == 0 ? turn : me;
        int c = chooseCue(cueOf[p]);
        if (c >= 0) { cueOf[p] = c; pl[p].cue = c; save(); send("C," + c); }
    }
    void showProfile(int p) {
        boolean edit = mode == 0 ? p == 0 : p == me;
        profileDialog(pl[p], edit, mode != 0 && p != me ? rivalIp : null);
    }
    void pauseMenu() {
        Object[] o = {"Continuar", "Abandonar partida"};
        int c = JOptionPane.showOptionDialog(frame, "Si abandonas pierdes la apuesta.", "Pausa", 0, JOptionPane.QUESTION_MESSAGE, null, o, o[0]);
        if (c == 1) finish(mode == 0 ? 1 : 1 - me, true);
    }

    // ---------------- DIBUJO ----------------
    BufferedImage buildBg() {
        BufferedImage im = new BufferedImage(W, H, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = im.createGraphics(); aa(g);
        Tbl t = T[tbl];
        g.setPaint(new GradientPaint(0, 0, new Color(24, 34, 58), 0, H, new Color(8, 12, 22))); g.fillRect(0, 0, W, H);
        g.setPaint(new GradientPaint(0, 0, new Color(36, 50, 84), 0, 86, new Color(16, 22, 40))); g.fillRect(0, 0, W, 86);
        g.setColor(new Color(0, 0, 0, 140)); g.fillRect(0, 86, W, 5);
        // marco de madera con veta
        int fx = TX - 46, fy = TY - 46, fw = TW + 92, fh = TH + 92;
        RoundRectangle2D frameShape = new RoundRectangle2D.Double(fx, fy, fw, fh, 46, 46);
        g.setColor(new Color(0, 0, 0, 120)); g.fill(new RoundRectangle2D.Double(fx + 6, fy + 10, fw, fh, 46, 46));
        g.setPaint(new GradientPaint(fx, fy, mix(t.wood, Color.WHITE, .2), fx, fy + fh, mix(t.wood, Color.BLACK, .35))); g.fill(frameShape);
        g.setClip(frameShape);
        Random rnd = new Random(tbl * 31 + 5);
        for (int i = 0; i < 260; i++) {
            int y = fy + rnd.nextInt(fh), x = fx + rnd.nextInt(fw);
            g.setColor(rnd.nextInt(4) == 0 ? new Color(255, 255, 255, 10 + rnd.nextInt(14)) : new Color(0, 0, 0, 8 + rnd.nextInt(22)));
            g.drawLine(x, y, x + 60 + rnd.nextInt(240), y + rnd.nextInt(5) - 2);
        }
        g.setClip(null);
        g.setStroke(new BasicStroke(2f)); g.setColor(new Color(255, 255, 255, 80)); g.draw(new RoundRectangle2D.Double(fx + 1, fy + 1, fw - 2, fh - 2, 46, 46));
        g.setColor(new Color(0, 0, 0, 160)); g.fill(new RoundRectangle2D.Double(TX - 21, TY - 21, TW + 42, TH + 42, 10, 10));
        g.setColor(t.trim); g.setStroke(new BasicStroke(2.5f)); g.draw(new RoundRectangle2D.Double(TX - 21, TY - 21, TW + 42, TH + 42, 10, 10));
        // paño con degradado y textura
        g.setPaint(new RadialGradientPaint(new Point2D.Double(TX + TW / 2.0, TY + TH / 2.0), (float) (TW * .56), new float[]{0f, .65f, 1f},
                new Color[]{mix(t.felt, Color.WHITE, .24), t.felt, mix(t.felt, Color.BLACK, .3)}));
        g.fillRect(TX - 18, TY - 18, TW + 36, TH + 36);
        Random nr = new Random(99);
        for (int i = 0; i < 32000; i++) {
            int a = 6 + nr.nextInt(14);
            g.setColor(nr.nextBoolean() ? new Color(255, 255, 255, a) : new Color(0, 0, 0, a)); g.fillRect(TX + nr.nextInt(TW), TY + nr.nextInt(TH), 1, 1);
        }
        // logo bordado, línea de cabecera y puntos de referencia
        g.setFont(new Font("Serif", Font.BOLD | Font.ITALIC, 40)); String nm = t.name.toUpperCase();
        g.setColor(new Color(255, 255, 255, 34)); g.drawString(nm, (int) (TX + TW * .125 - g.getFontMetrics().stringWidth(nm) / 2.0), TY + TH / 2 + 14);
        g.setColor(new Color(255, 255, 255, 60)); g.setStroke(new BasicStroke(1.5f)); g.drawLine(TX + TW / 4, TY, TX + TW / 4, TY + TH);
        g.draw(new Arc2D.Double(TX + TW / 4.0 - 70, TY + TH / 2.0 - 70, 140, 140, -90, -180, Arc2D.OPEN));
        for (double fxs : new double[]{.25, .5, .72}) { g.setColor(new Color(255, 255, 255, 110)); g.fill(new Ellipse2D.Double(TX + TW * fxs - 3, TY + TH / 2.0 - 3, 6, 6)); }
        // bandas (gomas) con puntas anguladas hacia las troneras
        Color nose = mix(t.felt, Color.WHITE, .12), base = mix(t.felt, Color.BLACK, .55);
        double[][] hs = {{TX + 30, TX + TW / 2.0 - 26}, {TX + TW / 2.0 + 26, TX + TW - 30}};
        for (double[] h : hs) {
            Path2D top = new Path2D.Double(); top.moveTo(h[0], TY); top.lineTo(h[1], TY); top.lineTo(h[1] - 16, TY - 16); top.lineTo(h[0] + 16, TY - 16); top.closePath();
            g.setPaint(new GradientPaint(0, TY, nose, 0, TY - 16, base)); g.fill(top);
            Path2D bot = new Path2D.Double(); bot.moveTo(h[0], TY + TH); bot.lineTo(h[1], TY + TH); bot.lineTo(h[1] - 16, TY + TH + 16); bot.lineTo(h[0] + 16, TY + TH + 16); bot.closePath();
            g.setPaint(new GradientPaint(0, TY + TH, nose, 0, TY + TH + 16, base)); g.fill(bot);
        }
        Path2D lf = new Path2D.Double(); lf.moveTo(TX, TY + 30); lf.lineTo(TX, TY + TH - 30); lf.lineTo(TX - 16, TY + TH - 46); lf.lineTo(TX - 16, TY + 46); lf.closePath();
        g.setPaint(new GradientPaint(TX, 0, nose, TX - 16, 0, base)); g.fill(lf);
        Path2D rt = new Path2D.Double(); rt.moveTo(TX + TW, TY + 30); rt.lineTo(TX + TW, TY + TH - 30); rt.lineTo(TX + TW + 16, TY + TH - 46); rt.lineTo(TX + TW + 16, TY + 46); rt.closePath();
        g.setPaint(new GradientPaint(TX + TW, 0, nose, TX + TW + 16, 0, base)); g.fill(rt);
        g.setColor(new Color(255, 255, 255, 50)); g.setStroke(new BasicStroke(1.2f));
        for (double[] h : hs) { g.drawLine((int) h[0], TY, (int) h[1], TY); g.drawLine((int) h[0], TY + TH, (int) h[1], TY + TH); }
        g.drawLine(TX, TY + 30, TX, TY + TH - 30); g.drawLine(TX + TW, TY + 30, TX + TW, TY + TH - 30);
        // troneras con aro de cuero y borde metálico
        for (int i = 0; i < 6; i++) {
            double r = prad(i), px = P[i][0], py = P[i][1];
            g.setColor(new Color(0, 0, 0, 110)); g.fill(new Ellipse2D.Double(px - r - 8, py - r - 5, 2 * r + 16, 2 * r + 16));
            g.setPaint(new GradientPaint((float) px, (float) (py - r), new Color(90, 60, 38), (float) px, (float) (py + r), new Color(28, 18, 12)));
            g.fill(new Ellipse2D.Double(px - r - 6, py - r - 6, 2 * r + 12, 2 * r + 12));
            g.setColor(t.trim); g.setStroke(new BasicStroke(2f)); g.draw(new Ellipse2D.Double(px - r - 6, py - r - 6, 2 * r + 12, 2 * r + 12));
            g.setPaint(new RadialGradientPaint(new Point2D.Double(px, py + 3), (float) (r + 2), new float[]{0f, .7f, 1f}, new Color[]{Color.BLACK, new Color(4, 4, 6), new Color(40, 34, 30)}));
            g.fill(new Ellipse2D.Double(px - r, py - r, 2 * r, 2 * r));
        }
        // diamantes (puntos de referencia) sobre la madera
        for (int k = 1; k < 8; k++) if (k != 4) { diamond(g, TX + TW * k / 8.0, TY - 33); diamond(g, TX + TW * k / 8.0, TY + TH + 33); }
        for (int k = 1; k < 4; k++) { diamond(g, TX - 33, TY + TH * k / 4.0); diamond(g, TX + TW + 33, TY + TH * k / 4.0); }
        // bandeja donde caen las bolas
        g.setPaint(new GradientPaint(TX + TW + 38, 0, new Color(40, 42, 50), TRX + 6, 0, new Color(150, 155, 165))); g.fillRect(TX + TW + 38, TRY + 14, TRX - (TX + TW + 38) + 6, 24);
        g.setPaint(new GradientPaint(TRX, 0, new Color(170, 175, 185), TRX + TRW, 0, new Color(60, 64, 74))); g.fill(new RoundRectangle2D.Double(TRX, TRY, TRW, TRH, 24, 24));
        g.setPaint(new GradientPaint(TRX, 0, new Color(8, 8, 12), TRX + TRW, 0, new Color(44, 46, 54))); g.fill(new RoundRectangle2D.Double(TRX + 5, TRY + 5, TRW - 10, TRH - 10, 18, 18));
        // marcos de la barra de fuerza (derecha) y del taco deslizante (izquierda)
        g.setPaint(new GradientPaint(PMR.x, 0, new Color(20, 22, 28), PMR.x + PMR.width, 0, new Color(60, 62, 70))); g.fillRoundRect(PMR.x, PMR.y, PMR.width, PMR.height, 14, 14);
        g.setColor(new Color(255, 255, 255, 80)); g.drawRoundRect(PMR.x, PMR.y, PMR.width, PMR.height, 14, 14);
        for (int y = PMR.y + 10; y < PMR.y + PMR.height - 8; y += 8) { int len = ((y - PMR.y) / 8) % 5 == 0 ? 24 : 12; g.setColor(new Color(255, 255, 255, 60)); g.drawLine(PMR.x + 8, y, PMR.x + 8 + len, y); }
        g.setPaint(new GradientPaint(SLR.x, 0, new Color(18, 20, 26), SLR.x + SLR.width, 0, new Color(58, 60, 68))); g.fillRoundRect(SLR.x, SLR.y, SLR.width, SLR.height, 14, 14);
        g.setColor(new Color(255, 255, 255, 80)); g.drawRoundRect(SLR.x, SLR.y, SLR.width, SLR.height, 14, 14);
        g.dispose();
        return im;
    }
    static void diamond(Graphics2D g, double cx, double cy) {
        Path2D d = new Path2D.Double(); d.moveTo(cx, cy - 5.5); d.lineTo(cx + 4, cy); d.lineTo(cx, cy + 5.5); d.lineTo(cx - 4, cy); d.closePath();
        g.setPaint(new GradientPaint((float) cx, (float) (cy - 5), new Color(255, 252, 235), (float) cx, (float) (cy + 5), new Color(190, 180, 150))); g.fill(d);
        g.setColor(new Color(0, 0, 0, 120)); g.setStroke(new BasicStroke(1f)); g.draw(d);
    }

    protected void paintComponent(Graphics g0) {
        Graphics2D g = (Graphics2D) g0; aa(g);
        if (bg == null) bg = buildBg();
        g.drawImage(bg, 0, 0, null);
        drawSideTools(g);
        for (int i = 0; i < tray.size(); i++) drawBall(g, TRX + TRW / 2.0, TRY + TRH - 18 - i * 22.5, tray.get(i), 10);
        if (called >= 0) { g.setColor(Color.YELLOW); g.setStroke(new BasicStroke(3)); g.draw(new Ellipse2D.Double(P[called][0] - 32, P[called][1] - 32, 64, 64)); }
        if (needCall() && mine() && called < 0) { g.setColor(new Color(255, 255, 0, 130)); g.setStroke(new BasicStroke(2));
            for (double[] p : P) g.draw(new Ellipse2D.Double(p[0] - 32, p[1] - 32, 64, 64)); }
        for (int i = 1; i < 16; i++) if (balls[i].alive) drawBall(g, balls[i].x, balls[i].y, i, R);
        Ball c = balls[0];
        if (state == PLACE && mine() && c.alive) { c.x = Math.max(TX + R, Math.min(TX + TW - R, mx)); c.y = Math.max(TY + R, Math.min(TY + TH - R, my)); }
        if (c.alive) drawBall(g, c.x, c.y, 0, R);
        if (state == AIM && mine()) drawCue(g);
        drawHud(g);
    }

    void drawSideTools(Graphics2D g) {
        // barra de fuerza (se llena de verde a rojo)
        int h = (int) ((PMR.height - 20) * power);
        if (h > 0) {
            Shape old = g.getClip(); g.setClip(new Rectangle(PMR.x + 4, PMR.y + 10, PMR.width - 8, PMR.height - 20));
            g.setPaint(new GradientPaint(0, PMR.y + PMR.height, new Color(60, 220, 80), 0, PMR.y, new Color(235, 40, 30)));
            g.fillRect(PMR.x + 4, PMR.y + PMR.height - 10 - h, PMR.width - 8, h); g.setClip(old);
        }
        // taco vertical que se retira al cargar fuerza
        Shape old = g.getClip(); g.setClip(new RoundRectangle2D.Double(SLR.x, SLR.y, SLR.width, SLR.height, 14, 14));
        double tip = SLR.y + 30 + power * 150;
        drawCueShape(g, SLR.x + 20, tip - 420, SLR.x + 20, tip, CUES[cueOf[Math.min(1, mode == 0 ? turn : me)]], 6, 2.4); g.setClip(old);
        // bola de efecto
        g.setColor(new Color(0, 0, 0, 120)); g.fill(new Ellipse2D.Double(SPX - SPR + 2, SPY - SPR + 3, 2 * SPR, 2 * SPR));
        g.setPaint(new RadialGradientPaint(new Point2D.Double(SPX - 9, SPY - 11), SPR * 1.5f, new float[]{0f, .6f, 1f}, new Color[]{Color.WHITE, new Color(235, 235, 230), new Color(150, 150, 150)}));
        g.fill(new Ellipse2D.Double(SPX - SPR, SPY - SPR, 2 * SPR, 2 * SPR));
        g.setColor(new Color(255, 255, 255, 220)); g.setStroke(new BasicStroke(3f)); g.draw(new Ellipse2D.Double(SPX - SPR, SPY - SPR, 2 * SPR, 2 * SPR));
        g.setColor(new Color(200, 30, 30)); g.fill(new Ellipse2D.Double(SPX + sx * SPR - 5, SPY + sy * SPR - 5, 10, 10));
        // botón de tacos
        g.setPaint(new GradientPaint(CUEB.x, CUEB.y, new Color(70, 150, 230), CUEB.x, CUEB.y + CUEB.height, new Color(25, 70, 140))); g.fillRoundRect(CUEB.x, CUEB.y, CUEB.width, CUEB.height, 12, 12);
        g.setColor(Color.WHITE); g.setStroke(new BasicStroke(2f)); g.drawRoundRect(CUEB.x, CUEB.y, CUEB.width, CUEB.height, 12, 12);
        Cue cu = CUES[cueOf[mode == 0 ? turn : me]];
        drawCueShape(g, CUEB.x + 8, CUEB.y + CUEB.height - 10, CUEB.x + CUEB.width - 8, CUEB.y + 10, cu, 3, 1.4);
        txt(g, "Tacos", CUEB.x + CUEB.width / 2, CUEB.y + CUEB.height + 15, F12, Color.WHITE, 1);
    }

    void drawCue(Graphics2D g) {
        Ball c = balls[0]; double ux = Math.cos(ang), uy = Math.sin(ang); Cue cu = CUES[cueOf[turn]];
        double x = c.x, y = c.y; Ball tgt = null;
        for (int s = 0; s < 1500; s++) {
            x += ux * 2; y += uy * 2;
            if (x < TX + R || x > TX + TW - R || y < TY + R || y > TY + TH - R) break;
            for (int i = 1; i < 16; i++) if (balls[i].alive && Math.hypot(balls[i].x - x, balls[i].y - y) < 2 * R) { tgt = balls[i]; break; }
            if (tgt != null) break;
        }
        g.setStroke(new BasicStroke(1.6f)); g.setColor(new Color(255, 255, 255, 190));
        g.draw(new Line2D.Double(c.x + ux * R, c.y + uy * R, x, y)); g.draw(new Ellipse2D.Double(x - R, y - R, 2 * R, 2 * R));
        if (tgt != null) {
            double dx = tgt.x - x, dy = tgt.y - y, l = Math.hypot(dx, dy), nx = dx / l, ny = dy / l;
            g.setColor(new Color(255, 230, 120, 210)); g.draw(new Line2D.Double(tgt.x, tgt.y, tgt.x + nx * (70 + cu.aim * 30), tgt.y + ny * (70 + cu.aim * 30)));
            double tx = -ny, ty = nx; if (tx * ux + ty * uy < 0) { tx = -tx; ty = -ty; } // la blanca sigue por la tangente
            g.setColor(new Color(255, 255, 255, 140)); g.draw(new Line2D.Double(x, y, x + tx * (40 + cu.aim * 20), y + ty * (40 + cu.aim * 20)));
        }
        double gap = R + 6 + power * 120;
        double tipX = c.x - ux * gap, tipY = c.y - uy * gap;
        g.setColor(new Color(0, 0, 0, 60)); g.setStroke(new BasicStroke(9f, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));
        g.draw(new Line2D.Double(tipX + 4, tipY + 6, tipX - ux * 330 + 4, tipY - uy * 330 + 6));
        drawCueShape(g, tipX - ux * 340, tipY - uy * 340, tipX, tipY, cu, 6.5, 2.4);
    }

    String groupText(int p) {
        if (grp[p] < 0) return "mesa abierta";
        if (remaining(grp[p]) == 0) return "bola 8";
        return grp[p] == 0 ? "lisas 1-7" : "rayadas 9-15";
    }

    void drawSlots(Graphics2D g, int p, int x0, int cy) {
        for (int i = 0; i < 8; i++) {
            int cx = x0 + i * 26;
            g.setColor(new Color(6, 8, 14)); g.fill(new Ellipse2D.Double(cx - 11, cy - 11, 22, 22));
            g.setColor(new Color(255, 255, 255, 40)); g.setStroke(new BasicStroke(1.2f)); g.draw(new Ellipse2D.Double(cx - 11, cy - 11, 22, 22));
            if (grp[p] < 0) continue;
            int id = i == 7 ? 8 : (grp[p] == 0 ? i + 1 : i + 9);
            boolean on = balls[id].alive;
            if (i == 7 && remaining(grp[p]) > 0) { g.setComposite(AlphaComposite.getInstance(AlphaComposite.SRC_OVER, .3f)); drawBall(g, cx, cy, 8, 10); g.setComposite(AlphaComposite.SrcOver); }
            else if (on) drawBall(g, cx, cy, id, 10);
        }
    }

    void drawHud(Graphics2D g) {
        Tbl t = T[tbl];
        // botón de menú
        g.setPaint(new GradientPaint(MENUB.x, MENUB.y, new Color(70, 220, 90), MENUB.x, MENUB.y + 50, new Color(20, 140, 40))); g.fillRoundRect(MENUB.x, MENUB.y, 50, 50, 12, 12);
        g.setColor(Color.WHITE); g.setStroke(new BasicStroke(2f)); g.drawRoundRect(MENUB.x, MENUB.y, 50, 50, 12, 12);
        for (int i = 0; i < 3; i++) g.fillRoundRect(MENUB.x + 10, MENUB.y + 12 + i * 11, 30, 6, 4, 4);
        // datos de la mesa y monedas
        txt(g, t.name, 76, 28, F16B, new Color(255, 225, 120), 0);
        txt(g, "Apuesta: " + fmt(t.bet), 76, 46, F12, Color.WHITE, 0);
        txt(g, "Premio: " + fmt(t.bet * 2), 76, 63, F12, Color.WHITE, 0);
        txt(g, "Monedas", 1075, 26, F12, new Color(200, 210, 230), 2);
        txt(g, fmt(coins), 1075, 48, F16B, new Color(255, 225, 120), 2);
        // jugadores
        for (int p = 0; p < 2; p++) {
            Rectangle a = AV[p]; boolean act = turn == p && state != OVER;
            drawAvatar(g, a.x, a.y, a.width, pl[p]);
            if (act) { g.setColor(new Color(60, 255, 80)); g.setStroke(new BasicStroke(4f)); g.drawRoundRect(a.x - 3, a.y - 3, a.width + 6, a.height + 6, 18, 18); }
            String nm = pl[p].name + (mode != 0 && p == me ? " (tú)" : "");
            if (p == 0) { txt(g, nm, 490, 28, F16B, Color.WHITE, 2); drawSlots(g, 0, 300, 54); }
            else { txt(g, nm, 710, 28, F16B, Color.WHITE, 0); drawSlots(g, 1, 720, 54); }
            if (System.currentTimeMillis() < emoteT[p]) { // burbuja de emote
                int bx = a.x + 2, by = a.y + 72;
                g.setColor(new Color(255, 255, 255, 235)); g.fillRoundRect(bx - 4, by - 4, 70, 70, 20, 20); g.setColor(new Color(0, 0, 0, 100)); g.drawRoundRect(bx - 4, by - 4, 70, 70, 20, 20);
                drawFace(g, bx + 31, by + 31, 28, emote[p]);
            }
        }
        g.setColor(new Color(0, 0, 0, 90)); g.fillRoundRect(566, 10, 68, 58, 16, 16);
        drawBall(g, 588, 39, 3, 14); drawBall(g, 614, 39, 11, 14);
        // botón de emotes y ruleta
        g.setPaint(new GradientPaint(EMB.x, EMB.y, new Color(255, 215, 70), EMB.x, EMB.y + 48, new Color(220, 140, 10))); g.fillOval(EMB.x, EMB.y, 48, 48);
        g.setColor(Color.WHITE); g.setStroke(new BasicStroke(2f)); g.drawOval(EMB.x, EMB.y, 48, 48); drawFace(g, EMB.x + 24, EMB.y + 24, 17, 0);
        if (emoteOpen) {
            g.setColor(new Color(10, 14, 28, 235)); g.fillRoundRect(76, 540, 290, 64, 32, 32); g.setColor(new Color(255, 255, 255, 120)); g.drawRoundRect(76, 540, 290, 64, 32, 32);
            for (int i = 0; i < 6; i++) drawFace(g, emx(i), 572, 20, i);
        }
        // turno y bolas que le toca meter
        String who = (broke ? "Va el jugador " : "Saca el jugador ") + (turn + 1) + "  ·  " + pl[turn].name + "  ·  " + groupText(turn);
        g.setPaint(new GradientPaint(0, 636, new Color(10, 14, 28, 230), 0, 672, new Color(30, 40, 70, 230))); g.fillRoundRect(W / 2 - 270, 636, 540, 36, 18, 18);
        g.setColor(new Color(60, 255, 80)); g.setStroke(new BasicStroke(2f)); g.drawRoundRect(W / 2 - 270, 636, 540, 36, 18, 18);
        txt(g, who, W / 2, 660, F16B, Color.WHITE, 1);
        if (!msg.isEmpty()) txt(g, msg, W / 2, 692, F14B, Color.YELLOW, 1);
    }

    // ======================= DIÁLOGOS =======================
    static void profileDialog(Profile p, boolean editable, String ip) {
        JDialog d = new JDialog(frame, "Perfil de " + p.name, true);
        JPanel body = new JPanel() {
            protected void paintComponent(Graphics g0) {
                Graphics2D g = (Graphics2D) g0; aa(g);
                g.setPaint(new GradientPaint(0, 0, new Color(34, 48, 82), 0, getHeight(), new Color(12, 16, 30))); g.fillRect(0, 0, getWidth(), getHeight());
                drawAvatar(g, 24, 24, 84, p);
                txt(g, p.name, 128, 54, new Font("SansSerif", Font.BOLD, 24), Color.WHITE, 0);
                g.setColor(new Color(0, 0, 0, 150)); g.fillRoundRect(128, 66, 250, 18, 10, 10);
                g.setPaint(new GradientPaint(128, 0, new Color(255, 200, 40), 378, 0, new Color(255, 120, 20))); g.fillRoundRect(128, 66, (int) (250.0 * p.xp / p.need()), 18, 10, 10);
                txt(g, "Nivel " + p.level + "   " + p.xp + "/" + p.need() + " XP", 253, 80, F12B, Color.WHITE, 1);
                txt(g, "Taco: " + CUES[Math.min(p.cue, CUES.length - 1)].name, 128, 106, F12, new Color(200, 210, 230), 0);
                String[] k = {"Partidas jugadas", "Victorias", "Derrotas", "% de victorias", "Ganancias totales", "Racha actual", "Mejor racha"};
                String[] v = {"" + p.games, "" + p.wins, "" + (p.games - p.wins), (p.games == 0 ? 0 : p.wins * 100 / p.games) + "%", fmt(p.earned), p.streak + (p.streak >= 2 ? " victorias" : ""), "" + p.best};
                for (int i = 0; i < k.length; i++) {
                    int y = 150 + i * 26;
                    g.setColor(new Color(255, 255, 255, i % 2 == 0 ? 14 : 6)); g.fillRoundRect(20, y - 17, 380, 24, 8, 8);
                    txt(g, k[i], 32, y, F14B, new Color(210, 220, 240), 0);
                    txt(g, v[i], 388, y, F14B, i == 4 ? new Color(255, 225, 120) : Color.WHITE, 2);
                }
                if (p.streak >= 2) drawFlame(g, 292, 150 + 5 * 26 - 6, 9);
                if (p.streak >= 2) drawFlame(g, 306, 150 + 5 * 26 - 6, 9);
            }
        };
        body.setPreferredSize(new Dimension(420, 350));
        JPanel bt = new JPanel();
        if (editable) { JButton b = new JButton("Cambiar nombre"); b.addActionListener(e -> {
            String n = JOptionPane.showInputDialog(d, "Nuevo nombre:", p.name);
            if (n != null && !n.trim().isEmpty()) { p.name = clean(n); save(); d.setTitle("Perfil de " + p.name); body.repaint(); } }); bt.add(b); }
        if (ip != null) { JButton b = new JButton("Agregar amigo"); b.addActionListener(e -> {
            for (String[] f : friends) if (f[1].equals(ip)) { JOptionPane.showMessageDialog(d, "Ya es tu amigo."); return; }
            friends.add(new String[]{clean(p.name), ip}); save(); JOptionPane.showMessageDialog(d, p.name + " fue agregado a tus amigos."); }); bt.add(b); }
        JButton cl = new JButton("Cerrar"); cl.addActionListener(e -> d.dispose()); bt.add(cl);
        d.setLayout(new BorderLayout()); d.add(body); d.add(bt, BorderLayout.SOUTH); d.pack(); d.setResizable(false); d.setLocationRelativeTo(frame); d.setVisible(true);
    }

    /** Selector de tacos: devuelve el índice elegido o -1. */
    static int chooseCue(int cur) {
        final int[] res = {-1};
        JDialog d = new JDialog(frame, "Tacos", true);
        JPanel p = new JPanel() {
            protected void paintComponent(Graphics g0) {
                Graphics2D g = (Graphics2D) g0; aa(g);
                g.setPaint(new GradientPaint(0, 0, new Color(30, 42, 70), 0, getHeight(), new Color(12, 18, 34))); g.fillRect(0, 0, getWidth(), getHeight());
                for (int i = 0; i < CUES.length; i++) {
                    int y = 12 + i * 84; boolean own = owned(i); Cue c = CUES[i];
                    g.setColor(i == cur ? new Color(40, 130, 60, 200) : new Color(255, 255, 255, 20)); g.fillRoundRect(12, y, 516, 76, 16, 16);
                    g.setColor(new Color(255, 255, 255, 70)); g.setStroke(new BasicStroke(1.5f)); g.drawRoundRect(12, y, 516, 76, 16, 16);
                    drawCueShape(g, 28, y + 52, 270, y + 24, c, 5, 2);
                    txt(g, c.name, 290, y + 22, F16B, Color.WHITE, 0);
                    String[] lb = {"Fuerza", "Efecto", "Puntería"}; int[] vs = {c.f, c.e, c.aim};
                    for (int s = 0; s < 3; s++) {
                        txt(g, lb[s], 290, y + 40 + s * 14, F12, new Color(200, 210, 230), 0);
                        for (int q = 0; q < 5; q++) { g.setColor(q < vs[s] ? new Color(255, 200, 40) : new Color(255, 255, 255, 40)); g.fillRect(352 + q * 14, y + 31 + s * 14, 11, 8); }
                    }
                    if (own) txt(g, i == cur ? "EQUIPADO" : "Elegir", 512, y + 44, F14B, i == cur ? new Color(120, 255, 140) : new Color(255, 225, 120), 2);
                    else {
                        g.setComposite(AlphaComposite.getInstance(AlphaComposite.SRC_OVER, .55f)); g.setColor(Color.BLACK); g.fillRoundRect(12, y, 516, 76, 16, 16); g.setComposite(AlphaComposite.SrcOver);
                        txt(g, "Bloqueado", 512, y + 28, F14B, new Color(255, 120, 100), 2);
                        g.setColor(new Color(255, 255, 255, 50)); g.fillRoundRect(430, y + 40, 82, 10, 6, 6);
                        g.setColor(new Color(60, 200, 255)); g.fillRoundRect(430, y + 40, 82 * Math.min(pieces[i], c.need) / c.need, 10, 6, 6);
                        txt(g, pieces[i] + "/" + c.need + " piezas (cajas)", 512, y + 66, F12, Color.WHITE, 2);
                    }
                }
            }
        };
        p.setPreferredSize(new Dimension(540, 12 + CUES.length * 84 + 4));
        p.addMouseListener(new MouseAdapter() { public void mousePressed(MouseEvent e) {
            int i = (e.getY() - 12) / 84;
            if (i >= 0 && i < CUES.length && e.getX() > 12 && e.getX() < 528 && owned(i)) { res[0] = i; d.dispose(); } } });
        d.add(p); d.pack(); d.setResizable(false); d.setLocationRelativeTo(frame); d.setVisible(true);
        return res[0];
    }

    static void friendsDialog() {
        JDialog d = new JDialog(frame, "Amigos", true);
        DefaultListModel<String> m = new DefaultListModel<>();
        Runnable fill = () -> { m.clear(); for (String[] f : friends) m.addElement(f[0] + "   —   " + f[1]); };
        fill.run();
        JList<String> l = new JList<>(m); l.setFont(new Font("SansSerif", Font.PLAIN, 16));
        String ip = "?"; try { ip = InetAddress.getLocalHost().getHostAddress(); } catch (Exception e) { }
        JLabel top = new JLabel("  Tu IP: " + ip + "  (pásasela a tu amigo)  puerto " + PORT); top.setBorder(BorderFactory.createEmptyBorder(8, 6, 8, 6));
        JButton add = new JButton("Agregar"), del = new JButton("Quitar"), join = new JButton("Unirse al amigo"), host = new JButton("Crear partida"), close = new JButton("Cerrar");
        add.addActionListener(e -> {
            String n = JOptionPane.showInputDialog(d, "Nombre del amigo:"); if (n == null || n.trim().isEmpty()) return;
            String a = JOptionPane.showInputDialog(d, "IP del amigo:", "192.168."); if (a == null || a.trim().isEmpty()) return;
            friends.add(new String[]{clean(n), a.trim().replaceAll("[;@,]", "")}); save(); fill.run(); });
        del.addActionListener(e -> { int i = l.getSelectedIndex(); if (i >= 0) { friends.remove(i); save(); fill.run(); } });
        join.addActionListener(e -> { int i = l.getSelectedIndex(); if (i < 0) { JOptionPane.showMessageDialog(d, "Elige un amigo de la lista."); return; } d.dispose(); joinGame(friends.get(i)[1]); });
        host.addActionListener(e -> { int t = pickTable(); if (t >= 0) { d.dispose(); hostGame(t); } });
        close.addActionListener(e -> d.dispose());
        JPanel bt = new JPanel(); bt.add(host); bt.add(join); bt.add(add); bt.add(del); bt.add(close);
        d.setLayout(new BorderLayout()); d.add(top, BorderLayout.NORTH); d.add(new JScrollPane(l), BorderLayout.CENTER); d.add(bt, BorderLayout.SOUTH);
        d.setSize(560, 380); d.setLocationRelativeTo(frame); d.setVisible(true);
    }

    static void openBox(int idx) {
        int tier = boxes.remove(idx);
        Random r = new Random();
        int[][] rg = {{50, 200}, {300, 1000}, {1500, 5000}, {50000, 250000}};
        long c = rg[tier][0] + r.nextInt(rg[tier][1] - rg[tier][0] + 1);
        coins += c;
        StringBuilder sb = new StringBuilder("<html><body style='width:260px'><h2>Caja de " + TIER[tier] + "</h2>+" + fmt(c) + " monedas<br>");
        int n = r.nextInt(100) < 55 + tier * 15 ? 1 + (tier >= 2 ? 1 : 0) + (tier == 3 ? 1 : 0) : 0;
        List<Integer> pool = new ArrayList<>();
        for (int i = 1; i < CUES.length; i++) if (!owned(i)) pool.add(i);
        for (int k = 0; k < n; k++) {
            if (pool.isEmpty()) { coins += 500L * (tier + 1); sb.append("+").append(fmt(500L * (tier + 1))).append(" monedas extra (ya tienes todos los tacos)<br>"); break; }
            int i = pool.get(r.nextInt(pool.size())); pieces[i]++;
            sb.append("+1 pieza del taco <b>").append(CUES[i].name).append("</b> (").append(Math.min(pieces[i], CUES[i].need)).append("/").append(CUES[i].need).append(")<br>");
            if (pieces[i] >= CUES[i].need) { sb.append("<b>¡Taco desbloqueado!</b><br>"); pool.remove(Integer.valueOf(i)); }
        }
        if (n == 0) sb.append("Esta vez no salieron piezas de taco.<br>");
        save();
        JOptionPane.showMessageDialog(frame, sb.toString(), "Caja abierta", JOptionPane.PLAIN_MESSAGE);
    }

    static void dailyGift() {
        long day = System.currentTimeMillis() / 86400000L;
        if (lastGift == day) { JOptionPane.showMessageDialog(frame, "Ya recogiste el regalo de hoy. ¡Vuelve mañana!"); return; }
        lastGift = day; long c = 5000 + self.level * 500L; coins += c; boxes.add(0); save();
        JOptionPane.showMessageDialog(frame, "Regalo diario: +" + fmt(c) + " monedas y una caja de Bronce.");
    }

    // ======================= MENÚ PRINCIPAL =======================
    static class MenuPanel extends JPanel implements MouseListener, MouseMotionListener {
        static final Rectangle PROF = new Rectangle(6, 4, 336, 68), TACOS = new Rectangle(560, 8, 88, 58), AMIG = new Rectangle(656, 8, 88, 58),
                CAJAS = new Rectangle(752, 8, 88, 58), GIFT = new Rectangle(42, 596, 76, 76), PLAY = new Rectangle(880, 606, 260, 62);
        static Rectangle card(int i) { return new Rectangle(42 + i * 280, 240, 255, 340); }
        static Rectangle slot(int i) { return new Rectangle(420 + i * 112, 592, 100, 84); }
        int hov = -1;

        MenuPanel() { setPreferredSize(new Dimension(W, H)); addMouseListener(this); addMouseMotionListener(this); }

        int hit(int x, int y) {
            for (int i = 0; i < 4; i++) if (card(i).contains(x, y)) return i;
            if (PROF.contains(x, y)) return 10; if (TACOS.contains(x, y)) return 11; if (AMIG.contains(x, y)) return 12; if (CAJAS.contains(x, y)) return 13;
            if (GIFT.contains(x, y)) return 14; for (int i = 0; i < 3; i++) if (slot(i).contains(x, y)) return 15 + i;
            if (PLAY.contains(x, y)) return 18;
            return -1;
        }
        void act(int id) {
            if (id >= 0 && id < 4) startTable(id);
            else if (id == 10) profileDialog(self, true, null);
            else if (id == 11) { int c = chooseCue(self.cue); if (c >= 0) { self.cue = c; save(); } }
            else if (id == 12 || id == 18) friendsDialog();
            else if (id == 13) { if (boxes.isEmpty()) JOptionPane.showMessageDialog(frame, "No tienes cajas. ¡Gana partidas para conseguirlas!"); else openBox(0); }
            else if (id == 14) dailyGift();
            else if (id >= 15 && id <= 17 && id - 15 < boxes.size()) openBox(id - 15);
            repaint();
        }

        void button(Graphics2D g, Rectangle r, Color c1, Color c2, boolean hv) {
            int o = hv ? -2 : 0;
            g.setColor(new Color(0, 0, 0, 100)); g.fillRoundRect(r.x + 2, r.y + 4, r.width, r.height, 16, 16);
            g.setPaint(new GradientPaint(r.x, r.y + o, c1, r.x, r.y + r.height + o, c2)); g.fillRoundRect(r.x, r.y + o, r.width, r.height, 16, 16);
            g.setColor(new Color(255, 255, 255, hv ? 230 : 150)); g.setStroke(new BasicStroke(2f)); g.drawRoundRect(r.x, r.y + o, r.width, r.height, 16, 16);
        }

        protected void paintComponent(Graphics g0) {
            Graphics2D g = (Graphics2D) g0; aa(g);
            g.setPaint(new RadialGradientPaint(new Point2D.Float(W / 2f, 260), 760, new float[]{0f, .55f, 1f}, new Color[]{new Color(255, 176, 48), new Color(222, 104, 22), new Color(104, 38, 10)}));
            g.fillRect(0, 0, W, H);
            for (int i = 0; i < 20; i++) {
                double a1 = i * Math.PI / 10, a2 = a1 + Math.PI / 20; Path2D p = new Path2D.Double(); p.moveTo(W / 2.0, 260);
                p.lineTo(W / 2.0 + Math.cos(a1) * 1500, 260 + Math.sin(a1) * 1500); p.lineTo(W / 2.0 + Math.cos(a2) * 1500, 260 + Math.sin(a2) * 1500); p.closePath();
                g.setColor(new Color(255, 255, 255, 16)); g.fill(p);
            }
            g.setPaint(new GradientPaint(0, 560, new Color(20, 90, 150, 0), 0, H, new Color(10, 56, 108))); g.fillRect(0, 560, W, H - 560);
            drawBall(g, 1128, 190, 1, 44); drawBall(g, 1080, 262, 2, 36); drawBall(g, 62, 200, 14, 40); drawBall(g, 110, 130, 5, 30);
            // barra superior
            g.setPaint(new GradientPaint(0, 0, new Color(44, 30, 22, 245), 0, 76, new Color(18, 12, 8, 250))); g.fillRect(0, 0, W, 76);
            g.setColor(new Color(255, 160, 40)); g.fillRect(0, 74, W, 3);
            drawAvatar(g, 10, 8, 58, self);
            txt(g, self.name, 80, 26, F16B, hov == 10 ? new Color(255, 225, 120) : Color.WHITE, 0);
            g.setColor(new Color(0, 0, 0, 160)); g.fillRoundRect(80, 33, 190, 15, 8, 8);
            g.setPaint(new GradientPaint(80, 0, new Color(255, 200, 40), 270, 0, new Color(255, 120, 20))); g.fillRoundRect(80, 33, (int) (190.0 * self.xp / self.need()), 15, 8, 8);
            txt(g, "Nv. " + self.level + "  " + self.xp + "/" + self.need(), 175, 45, new Font("SansSerif", Font.BOLD, 11), Color.WHITE, 1);
            txt(g, "Partidas " + self.games + "  ·  Victorias " + self.wins + "  ·  " + (self.games == 0 ? 0 : self.wins * 100 / self.games) + "%", 80, 66, F12, new Color(220, 225, 240), 0);
            g.setColor(new Color(255, 255, 255, 22)); g.fillRoundRect(352, 12, 170, 50, 14, 14);
            if (self.streak >= 2) { drawFlame(g, 374, 36, 14); txt(g, "Racha: " + self.streak, 396, 31, F14B, new Color(255, 200, 80), 0); }
            else txt(g, "Sin racha", 396, 31, F14B, new Color(170, 175, 190), 0);
            txt(g, "Mejor racha: " + self.best, 396, 50, F12, new Color(220, 225, 240), 0);
            // botones de la barra
            button(g, TACOS, new Color(70, 150, 230), new Color(25, 70, 140), hov == 11);
            drawCueShape(g, TACOS.x + 14, TACOS.y + 38, TACOS.x + 74, TACOS.y + 10, CUES[self.cue], 3.6, 1.6); txt(g, "Tacos", TACOS.x + 44, TACOS.y + 54, F12B, Color.WHITE, 1);
            button(g, AMIG, new Color(70, 200, 120), new Color(20, 120, 60), hov == 12);
            g.setColor(Color.WHITE); g.fillOval(AMIG.x + 24, AMIG.y + 8, 16, 16); g.fillOval(AMIG.x + 48, AMIG.y + 8, 16, 16);
            g.fillArc(AMIG.x + 18, AMIG.y + 24, 28, 24, 0, 180); g.fillArc(AMIG.x + 42, AMIG.y + 24, 28, 24, 0, 180);
            txt(g, "Amigos", AMIG.x + 44, AMIG.y + 54, F12B, Color.WHITE, 1);
            button(g, CAJAS, new Color(255, 190, 50), new Color(200, 110, 10), hov == 13);
            drawBox(g, CAJAS.x + 30, CAJAS.y + 6, 28, 30, TIERC[boxes.isEmpty() ? 0 : boxes.get(0)]); txt(g, "Cajas", CAJAS.x + 44, CAJAS.y + 54, F12B, Color.WHITE, 1);
            if (!boxes.isEmpty()) { g.setColor(new Color(220, 30, 30)); g.fillOval(CAJAS.x + 68, CAJAS.y - 4, 22, 22); txt(g, "" + boxes.size(), CAJAS.x + 79, CAJAS.y + 12, F12B, Color.WHITE, 1); }
            g.setColor(new Color(0, 0, 0, 150)); g.fillRoundRect(880, 14, 290, 48, 24, 24); g.setColor(new Color(255, 200, 60)); g.setStroke(new BasicStroke(2f)); g.drawRoundRect(880, 14, 290, 48, 24, 24);
            drawCoin(g, 906, 38, 15); txt(g, fmt(coins), 1156, 46, F20B, Color.WHITE, 2);
            // logo
            drawBall(g, 330, 160, 8, 54);
            Shape s1 = new TextLayout("8 BALL", new Font("SansSerif", Font.BOLD | Font.ITALIC, 44), g.getFontRenderContext()).getOutline(AffineTransform.getTranslateInstance(404, 128));
            Shape s2 = new TextLayout("POOL", new Font("SansSerif", Font.BOLD | Font.ITALIC, 100), g.getFontRenderContext()).getOutline(AffineTransform.getTranslateInstance(404, 206));
            g.setStroke(new BasicStroke(9f, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND)); g.setColor(new Color(50, 14, 0)); g.draw(s1); g.draw(s2);
            g.setPaint(new GradientPaint(0, 96, Color.WHITE, 0, 130, new Color(230, 230, 240))); g.fill(s1);
            g.setPaint(new GradientPaint(0, 130, new Color(255, 246, 130), 0, 206, new Color(255, 100, 20))); g.fill(s2);
            txt(g, "ELIGE TU MESA", W / 2, 232, new Font("SansSerif", Font.BOLD, 18), new Color(255, 240, 200), 1);
            for (int i = 0; i < 4; i++) drawCard(g, i);
            // cajas por abrir
            button(g, GIFT, new Color(255, 215, 70), new Color(220, 140, 10), hov == 14);
            g.setColor(Color.WHITE); g.fillRect(GIFT.x + 20, GIFT.y + 30, 36, 30); g.setColor(new Color(220, 30, 40)); g.fillRect(GIFT.x + 35, GIFT.y + 22, 6, 38); g.fillRect(GIFT.x + 20, GIFT.y + 42, 36, 6);
            txt(g, "Regalo", GIFT.x + 38, GIFT.y + 72, F12B, Color.WHITE, 1);
            for (int i = 0; i < 3; i++) {
                Rectangle r = slot(i);
                if (i < boxes.size()) {
                    button(g, r, new Color(90, 220, 90), new Color(30, 140, 40), hov == 15 + i);
                    drawBox(g, r.x + 30, r.y + 6, 40, 42, TIERC[boxes.get(i)]);
                    txt(g, "Abrir", r.x + 50, r.y + 72, F14B, Color.WHITE, 1);
                } else {
                    g.setColor(new Color(0, 0, 0, 90)); g.fillRoundRect(r.x, r.y, r.width, r.height, 16, 16);
                    g.setColor(new Color(255, 255, 255, 50)); g.setStroke(new BasicStroke(1.5f)); g.drawRoundRect(r.x, r.y, r.width, r.height, 16, 16);
                    txt(g, "Vacío", r.x + 50, r.y + 48, F12B, new Color(255, 255, 255, 110), 1);
                }
            }
            if (boxes.size() > 3) txt(g, "+" + (boxes.size() - 3) + " cajas más", 758, 690, F12B, Color.WHITE, 0);
            button(g, PLAY, new Color(255, 170, 40), new Color(220, 100, 10), hov == 18);
            txt(g, "Juega con amigos", PLAY.x + PLAY.width / 2, PLAY.y + 38, new Font("SansSerif", Font.BOLD, 24), Color.WHITE, 1);
        }

        void drawCard(Graphics2D g, int i) {
            Tbl t = T[i]; Rectangle r = card(i); boolean can = coins >= t.bet, hv = hov == i; int o = hv ? -6 : 0, x = r.x, y = r.y + o, w = r.width, h = r.height;
            boolean vip = i == 3;
            g.setColor(new Color(0, 0, 0, 110)); g.fillRoundRect(x + 4, y + 8, w, h, 26, 26);
            g.setPaint(new GradientPaint(x, y, new Color(40, 56, 96), x, y + h, new Color(14, 20, 40))); g.fillRoundRect(x, y, w, h, 26, 26);
            g.setPaint(new GradientPaint(x, y, vip ? new Color(255, 236, 130) : mix(t.trim, Color.WHITE, .3), x, y + h, vip ? new Color(200, 140, 20) : t.trim));
            g.setStroke(new BasicStroke(vip ? 5f : 3f)); g.drawRoundRect(x, y, w, h, 26, 26);
            txt(g, t.name, x + w / 2, y + 36, new Font("SansSerif", Font.BOLD, 24), vip ? new Color(255, 232, 120) : Color.WHITE, 1);
            // mini mesa
            int mx0 = x + 24, my0 = y + 54, mw = w - 48, mh = 104;
            g.setPaint(new GradientPaint(mx0, my0, mix(t.wood, Color.WHITE, .2), mx0, my0 + mh, mix(t.wood, Color.BLACK, .3))); g.fillRoundRect(mx0, my0, mw, mh, 22, 22);
            g.setPaint(new RadialGradientPaint(new Point2D.Double(mx0 + mw / 2.0, my0 + mh / 2.0), mw * .55f, new float[]{0f, 1f}, new Color[]{mix(t.felt, Color.WHITE, .2), mix(t.felt, Color.BLACK, .25)}));
            g.fillRoundRect(mx0 + 10, my0 + 10, mw - 20, mh - 20, 10, 10);
            g.setColor(Color.BLACK);
            for (int a = 0; a < 3; a++) for (int b = 0; b < 2; b++) g.fill(new Ellipse2D.Double(mx0 + 4 + a * (mw - 22) / 2.0, my0 + 4 + b * (mh - 22), 14, 14));
            drawBall(g, mx0 + mw * .27, my0 + mh / 2.0, 0, 5);
            int[] ids = {1, 9, 3, 11, 8, 5, 13};
            for (int k = 0, n = 0; k < 3; k++) for (int j = 0; j <= k; j++) drawBall(g, mx0 + mw * .62 + k * 9, my0 + mh / 2.0 + (j - k / 2.0) * 10, ids[n++ % ids.length], 4.6);
            if (vip) txt(g, "VIP", x + w - 30, y + 28, F14B, new Color(255, 232, 120), 1);
            // datos
            String[] k = {"Apuesta", "Premio", "Jugadores", "Caja", "Regla"};
            for (int q = 0; q < 5; q++) {
                int ty = y + 177 + q * 25;
                g.setColor(new Color(255, 255, 255, q % 2 == 0 ? 14 : 5)); g.fillRoundRect(x + 12, ty - 17, w - 24, 23, 8, 8);
                txt(g, k[q], x + 22, ty, F14B, new Color(200, 212, 235), 0);
                if (q <= 1) { String v = fmt(q == 0 ? t.bet : t.bet * 2); txt(g, v, x + w - 40, ty, F14B, new Color(255, 225, 120), 2); drawCoin(g, x + w - 27, ty - 5, 7); }
                else if (q == 2) txt(g, "2   (1 vs 1)", x + w - 22, ty, F14B, Color.WHITE, 2);
                else if (q == 3) txt(g, TIER[t.tier], x + w - 22, ty, F14B, TIERC[t.tier], 2);
                else txt(g, t.call ? "8 cantada" : "8 libre", x + w - 22, ty, F14B, Color.WHITE, 2);
            }
            Rectangle b = new Rectangle(x + 20, y + h - 44, w - 40, 32);
            g.setPaint(new GradientPaint(b.x, b.y, can ? new Color(90, 230, 90) : new Color(130, 130, 140), b.x, b.y + b.height, can ? new Color(30, 150, 40) : new Color(70, 70, 80)));
            g.fillRoundRect(b.x, b.y, b.width, b.height, 14, 14); g.setColor(new Color(255, 255, 255, 170)); g.setStroke(new BasicStroke(1.5f)); g.drawRoundRect(b.x, b.y, b.width, b.height, 14, 14);
            txt(g, can ? "JUGAR" : "Faltan monedas", b.x + b.width / 2, b.y + 24, F16B, Color.WHITE, 1);
        }

        public void mouseMoved(MouseEvent e) { int h = hit(e.getX(), e.getY()); if (h != hov) { hov = h; setCursor(Cursor.getPredefinedCursor(h >= 0 ? Cursor.HAND_CURSOR : Cursor.DEFAULT_CURSOR)); repaint(); } }
        public void mousePressed(MouseEvent e) { act(hit(e.getX(), e.getY())); }
        public void mouseDragged(MouseEvent e) { }
        public void mouseClicked(MouseEvent e) { }
        public void mouseReleased(MouseEvent e) { }
        public void mouseEntered(MouseEvent e) { }
        public void mouseExited(MouseEvent e) { }
    }

    // ======================= PARTIDAS Y RED =======================
    static int pickTable() {
        Object[] t = new Object[T.length];
        for (int i = 0; i < T.length; i++) t[i] = T[i].name + " (apuesta " + fmt(T[i].bet) + ")";
        int c = JOptionPane.showOptionDialog(frame, "Monedas: " + fmt(coins) + "\nElige mesa:", "Mesas", 0, JOptionPane.QUESTION_MESSAGE, null, t, t[0]);
        if (c < 0) return -1;
        if (coins < T[c].bet) { JOptionPane.showMessageDialog(frame, "No tienes monedas suficientes."); return pickTable(); }
        return c;
    }

    static void startTable(int i) {
        Tbl t = T[i];
        if (coins < t.bet) { JOptionPane.showMessageDialog(frame, "No tienes monedas suficientes para " + t.name + " (apuesta " + fmt(t.bet) + ")."); return; }
        Object[] o = {"Local (2 jugadores)", "Crear partida online", "Unirse a partida online", "Cancelar"};
        int c = JOptionPane.showOptionDialog(frame, t.name + "  ·  Apuesta " + fmt(t.bet) + "\n¿Cómo quieres jugar?", "Mesa", 0, JOptionPane.QUESTION_MESSAGE, null, o, o[0]);
        if (c == 0) launch(new Pool8(0, i, System.nanoTime(), null, null));
        else if (c == 1) hostGame(i);
        else if (c == 2) joinGame(null);
    }

    static void hostGame(int t) {
        long seed = System.nanoTime();
        JFrame w = new JFrame("Esperando amigo...");
        String ip = "?"; try { ip = InetAddress.getLocalHost().getHostAddress(); } catch (Exception e) { }
        w.add(new JLabel("  " + T[t].name + "  ·  Tu IP: " + ip + "  puerto " + PORT + "  (cierra esta ventana para cancelar)  "));
        w.pack(); w.setLocationRelativeTo(frame); w.setVisible(true);
        final ServerSocket[] ss = new ServerSocket[1];
        w.addWindowListener(new WindowAdapter() { public void windowClosing(WindowEvent e) { try { ss[0].close(); } catch (Exception x) { } } });
        new Thread(() -> {
            try {
                ss[0] = new ServerSocket(PORT); Socket s = ss[0].accept(); ss[0].close();
                new PrintWriter(s.getOutputStream(), true).println("T," + t + "," + seed);
                BufferedReader in = new BufferedReader(new InputStreamReader(s.getInputStream()));
                SwingUtilities.invokeLater(() -> { w.dispose(); launch(new Pool8(1, t, seed, s, in)); });
            } catch (Exception e) { }
        }).start();
    }

    static void joinGame(String ipIn) {
        String ip = ipIn != null ? ipIn : JOptionPane.showInputDialog(frame, "IP del anfitrión:", "127.0.0.1");
        if (ip == null) return;
        new Thread(() -> {
            try {
                Socket s = new Socket(ip.trim(), PORT);
                BufferedReader in = new BufferedReader(new InputStreamReader(s.getInputStream()));
                String[] p = in.readLine().split(",");
                int tb = Integer.parseInt(p[1]); long sd = Long.parseLong(p[2]);
                if (coins < T[tb].bet) {
                    s.close();
                    SwingUtilities.invokeLater(() -> JOptionPane.showMessageDialog(frame, "No tienes monedas para esa mesa (" + T[tb].name + ", apuesta " + fmt(T[tb].bet) + ")."));
                    return;
                }
                SwingUtilities.invokeLater(() -> launch(new Pool8(2, tb, sd, s, in)));
            } catch (Exception e) { SwingUtilities.invokeLater(() -> JOptionPane.showMessageDialog(frame, "No se pudo conectar.")); }
        }).start();
    }

    static void show(JComponent c, String title) {
        frame.setTitle(title); frame.setContentPane(c); frame.pack(); frame.setLocationRelativeTo(null); frame.revalidate(); frame.repaint();
    }
    static void launch(Pool8 p) { show(p, "8 Ball Pool - " + T[p.tbl].name); }
    static void menu() { load(); if (coins < 100) { coins = 500; save(); } show(new MenuPanel(), "8 Ball Pool"); }

    static void startup() {
        load();
        frame = new JFrame("8 Ball Pool");
        frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE); frame.setResizable(false);
        if (!named) {
            String n = JOptionPane.showInputDialog(null, "¡Bienvenido! ¿Cómo te llamas?", "Jugador");
            self.name = n == null || n.trim().isEmpty() ? "Jugador" : clean(n); named = true; save();
        }
        menu(); frame.setVisible(true);
    }

    public static void main(String[] a) { SwingUtilities.invokeLater(Pool8::startup); }
}
